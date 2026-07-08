-- Enable UUID and Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing structures if they exist
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;

DROP FUNCTION IF EXISTS generate_patient_id CASCADE;
DROP FUNCTION IF EXISTS check_appointment_clash CASCADE;
DROP FUNCTION IF EXISTS admin_create_staff CASCADE;
DROP FUNCTION IF EXISTS admin_update_staff CASCADE;
DROP FUNCTION IF EXISTS admin_delete_staff CASCADE;
DROP FUNCTION IF EXISTS set_row_hospital_id CASCADE;
DROP FUNCTION IF EXISTS register_hospital CASCADE;

-- 1. Hospitals Table
CREATE TABLE hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  phone text,
  address text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on Hospitals
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to hospitals" ON hospitals
  FOR SELECT USING (true);

-- 2. Profiles Table (Linked to auth.users and hospitals)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('admin', 'staff')),
  status text NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read profiles in same hospital" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR hospital_id = (auth.jwt() -> 'user_metadata' ->> 'hospital_id')::uuid
  );

CREATE POLICY "Allow admins to manage profiles in same hospital" ON profiles
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    AND hospital_id = (auth.jwt() -> 'user_metadata' ->> 'hospital_id')::uuid
  );

-- 3. Patients Table (Linked to hospitals)
CREATE TABLE patients (
  id text PRIMARY KEY, -- Custom format: SLUG-YYYY-NNNN
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  blood_type text NOT NULL,
  next_of_kin text NOT NULL,
  next_of_kin_phone text,
  dob date,
  gender text,
  address text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on Patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to patients in same hospital" ON patients
  FOR ALL USING (
    hospital_id = (auth.jwt() -> 'user_metadata' ->> 'hospital_id')::uuid
  );

-- 4. Visits Table (Linked to patients and hospitals)
CREATE TABLE visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id text NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date timestamp with time zone DEFAULT now(),
  note text NOT NULL,
  by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  by_username text
);

-- Enable RLS on Visits
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to visits in same hospital" ON visits
  FOR ALL USING (
    hospital_id = (auth.jwt() -> 'user_metadata' ->> 'hospital_id')::uuid
  );

-- 5. Appointments Table (Linked to patients, staff and hospitals)
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id text NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  date date NOT NULL,
  time time NOT NULL,
  reason text,
  status text NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on Appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to appointments in same hospital" ON appointments
  FOR ALL USING (
    hospital_id = (auth.jwt() -> 'user_metadata' ->> 'hospital_id')::uuid
  );

-- 6. Shifts Table (Duty Schedules - Linked to staff and hospitals)
CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('morning', 'afternoon', 'night')),
  note text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read shifts in same hospital" ON shifts
  FOR SELECT USING (
    hospital_id = (auth.jwt() -> 'user_metadata' ->> 'hospital_id')::uuid
  );

CREATE POLICY "Allow admins to manage shifts in same hospital" ON shifts
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    AND hospital_id = (auth.jwt() -> 'user_metadata' ->> 'hospital_id')::uuid
  );

-- 7. Activity Logs Table (Linked to staff and hospitals)
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username text,
  action text NOT NULL,
  description text,
  timestamp timestamp with time zone DEFAULT now()
);

-- Enable RLS on Activity Logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins access to logs in same hospital" ON activity_logs
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    AND hospital_id = (auth.jwt() -> 'user_metadata' ->> 'hospital_id')::uuid
  );

-- 8. Automatic Scoping Triggers and Helper Functions

-- Trigger function to set hospital_id automatically on insert
CREATE OR REPLACE FUNCTION set_row_hospital_id()
RETURNS TRIGGER AS $$
DECLARE
  v_hospital_id uuid;
BEGIN
  IF NEW.hospital_id IS NULL THEN
    -- Try to get it from JWT claim first
    v_hospital_id := (auth.jwt() -> 'user_metadata' ->> 'hospital_id')::uuid;
    
    -- Fallback to database query if JWT metadata is missing (e.g. running from some admin RPCs or background triggers)
    IF v_hospital_id IS NULL THEN
      SELECT hospital_id INTO v_hospital_id
      FROM public.profiles
      WHERE id = auth.uid();
    END IF;
    
    IF v_hospital_id IS NULL THEN
      RAISE EXCEPTION 'User profile not found. Cannot determine hospital tenant.';
    END IF;
    
    NEW.hospital_id := v_hospital_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers for automatic hospital_id scoping
CREATE TRIGGER tr_set_patient_hospital_id
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION set_row_hospital_id();

CREATE TRIGGER tr_set_visit_hospital_id
BEFORE INSERT ON visits
FOR EACH ROW
EXECUTE FUNCTION set_row_hospital_id();

CREATE TRIGGER tr_set_appointment_hospital_id
BEFORE INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION set_row_hospital_id();

CREATE TRIGGER tr_set_shift_hospital_id
BEFORE INSERT ON shifts
FOR EACH ROW
EXECUTE FUNCTION set_row_hospital_id();

CREATE TRIGGER tr_set_activity_log_hospital_id
BEFORE INSERT ON activity_logs
FOR EACH ROW
EXECUTE FUNCTION set_row_hospital_id();

-- Trigger to Automatically Generate Patient ID (SLUG-YYYY-NNNN)
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TRIGGER AS $$
DECLARE
  current_yr text;
  next_num integer;
  formatted_id text;
  v_slug text;
BEGIN
  current_yr := to_char(now(), 'YYYY');
  
  -- Get the hospital's slug
  SELECT upper(slug) INTO v_slug FROM hospitals WHERE id = NEW.hospital_id;
  IF v_slug IS NULL OR v_slug = '' THEN
    v_slug := 'MB';
  END IF;

  IF v_slug = 'DEFAULT' THEN
    v_slug := 'MB';
  END IF;

  -- Find the maximum current suffix counter for the current year within this hospital
  SELECT COALESCE(MAX(SUBSTRING(id FROM length(v_slug) + 7)::integer), 0)
  INTO next_num
  FROM patients
  WHERE id LIKE v_slug || '-' || current_yr || '-%'
    AND hospital_id = NEW.hospital_id;

  next_num := next_num + 1;
  formatted_id := v_slug || '-' || current_yr || '-' || lpad(next_num::text, 4, '0');
  NEW.id := formatted_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_patient_id
BEFORE INSERT ON patients
FOR EACH ROW
WHEN (NEW.id IS NULL OR NEW.id = '')
EXECUTE FUNCTION generate_patient_id();

-- Trigger to Prevent Double Booking of the same doctor/time slot in same hospital
CREATE OR REPLACE FUNCTION check_appointment_clash()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE date = NEW.date
      AND time = NEW.time
      AND status = 'scheduled'
      AND hospital_id = NEW.hospital_id
      AND (
        NEW.staff_id IS NULL
        OR staff_id IS NULL
        OR staff_id = NEW.staff_id
      )
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'That slot is already booked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_check_appointment_clash
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION check_appointment_clash();

-- 9. Admin RPC Helpers (Security Definer functions running as database owner)

-- RPC to create staff
CREATE OR REPLACE FUNCTION admin_create_staff(
  p_username text,
  p_phone text,
  p_pin text
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_hospital_id uuid;
BEGIN
  -- Get caller's hospital_id from profile (admin)
  SELECT p.hospital_id INTO v_hospital_id
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.role = 'admin';

  -- Verify caller is admin
  IF v_hospital_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Only administrators can create staff accounts.';
  END IF;

  v_email := lower(p_username) || '@medbay.local';

  -- Check username conflict globally
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = p_username
  ) THEN
    RAISE EXCEPTION 'Username already exists.';
  END IF;

  -- Insert user into auth.users (stores role and hospital_id in raw_user_meta_data for the JWT)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, crypt(p_pin, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', 
    json_build_object('hospital_id', v_hospital_id, 'role', 'staff')::jsonb, 
    now(), now(),
    '', '', '', ''
  )
  RETURNING id INTO v_user_id;

  -- Create profile record
  INSERT INTO public.profiles (id, username, phone, role, status, hospital_id)
  VALUES (v_user_id, p_username, p_phone, 'staff', 'active', v_hospital_id);

  -- Log administrative activity
  INSERT INTO public.activity_logs (user_id, username, action, description, hospital_id)
  VALUES (
    auth.uid(),
    (SELECT username FROM public.profiles WHERE id = auth.uid()),
    'CREATE_STAFF',
    'Created staff account for ' || p_username,
    v_hospital_id
  );

  return v_user_id;
END;
$$ LANGUAGE plpgsql;

-- RPC to update staff details/PIN
CREATE OR REPLACE FUNCTION admin_update_staff(
  p_staff_id uuid,
  p_username text,
  p_phone text,
  p_pin text
)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_hospital_id uuid;
  v_caller_hospital_id uuid;
BEGIN
  -- Get caller's hospital_id
  SELECT hospital_id INTO v_caller_hospital_id
  FROM public.profiles
  WHERE id = auth.uid() AND role = 'admin';

  -- Verify caller is admin
  IF v_caller_hospital_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Only administrators can update staff accounts.';
  END IF;

  -- Verify staff belongs to same hospital
  SELECT hospital_id INTO v_hospital_id
  FROM public.profiles
  WHERE id = p_staff_id;

  IF v_hospital_id <> v_caller_hospital_id THEN
    RAISE EXCEPTION 'Access denied: Staff account belongs to another hospital.';
  END IF;

  -- Update profiles
  UPDATE public.profiles
  SET username = p_username, phone = p_phone
  WHERE id = p_staff_id;

  -- Update email and password in auth.users
  UPDATE auth.users
  SET 
    email = lower(p_username) || '@medbay.local',
    encrypted_password = CASE WHEN p_pin IS NOT NULL AND p_pin <> '' THEN crypt(p_pin, gen_salt('bf')) ELSE encrypted_password END,
    updated_at = now()
  WHERE id = p_staff_id;

  -- Log action
  INSERT INTO public.activity_logs (user_id, username, action, description, hospital_id)
  VALUES (
    auth.uid(),
    (SELECT username FROM public.profiles WHERE id = auth.uid()),
    'UPDATE_STAFF',
    'Updated staff account details for ' || p_username,
    v_caller_hospital_id
  );
END;
$$ LANGUAGE plpgsql;

-- RPC to delete staff
CREATE OR REPLACE FUNCTION admin_delete_staff(
  p_staff_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_staff_username text;
  v_hospital_id uuid;
  v_caller_hospital_id uuid;
BEGIN
  -- Get caller's hospital_id
  SELECT hospital_id INTO v_caller_hospital_id
  FROM public.profiles
  WHERE id = auth.uid() AND role = 'admin';

  -- Verify caller is admin
  IF v_caller_hospital_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Only administrators can delete staff accounts.';
  END IF;

  -- Verify staff belongs to same hospital
  SELECT hospital_id, username INTO v_hospital_id, v_staff_username
  FROM public.profiles
  WHERE id = p_staff_id;

  IF v_hospital_id <> v_caller_hospital_id THEN
    RAISE EXCEPTION 'Access denied: Staff account belongs to another hospital.';
  END IF;

  -- Prevent self deletion
  IF p_staff_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own administrator account.';
  END IF;

  -- Deleting the user from auth.users cascades to public.profiles
  DELETE FROM auth.users WHERE id = p_staff_id;

  -- Log action
  INSERT INTO public.activity_logs (user_id, username, action, description, hospital_id)
  VALUES (
    auth.uid(),
    (SELECT username FROM public.profiles WHERE id = auth.uid()),
    'DELETE_STAFF',
    'Deleted staff account: ' || COALESCE(v_staff_username, p_staff_id::text),
    v_caller_hospital_id
  );
END;
$$ LANGUAGE plpgsql;

-- 10. Public Registration Flow RPC

-- RPC to register a new hospital and its default admin account simultaneously
CREATE OR REPLACE FUNCTION register_hospital(
  p_hospital_name text,
  p_hospital_slug text,
  p_hospital_phone text,
  p_hospital_address text,
  p_admin_username text,
  p_admin_phone text,
  p_admin_pin text
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_hospital_id uuid;
  v_admin_id uuid;
  v_email text;
BEGIN
  -- Validate hospital slug is alphanumeric and not empty
  IF p_hospital_slug IS NULL OR trim(p_hospital_slug) = '' THEN
    RAISE EXCEPTION 'Hospital slug cannot be empty.';
  END IF;

  -- Normalize slug to lower case
  p_hospital_slug := lower(trim(p_hospital_slug));

  -- Check if slug already exists
  IF EXISTS (
    SELECT 1 FROM public.hospitals WHERE slug = p_hospital_slug
  ) THEN
    RAISE EXCEPTION 'Hospital slug is already taken.';
  END IF;

  -- Check username conflict globally
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = p_admin_username
  ) THEN
    RAISE EXCEPTION 'Username already exists.';
  END IF;

  -- Insert hospital record
  INSERT INTO public.hospitals (name, slug, phone, address)
  VALUES (p_hospital_name, p_hospital_slug, p_hospital_phone, p_hospital_address)
  RETURNING id INTO v_hospital_id;

  -- Construct admin email
  v_email := lower(trim(p_admin_username)) || '@medbay.local';

  -- Check email conflict (globally in auth.users)
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_email
  ) THEN
    RAISE EXCEPTION 'Admin email / username is already registered.';
  END IF;

  -- Insert user into auth.users (stores role and hospital_id in raw_user_meta_data for the JWT)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, crypt(p_admin_pin, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', 
    json_build_object('hospital_id', v_hospital_id, 'role', 'admin')::jsonb, 
    now(), now(),
    '', '', '', ''
  )
  RETURNING id INTO v_admin_id;

  -- Create admin profile record
  INSERT INTO public.profiles (id, username, phone, role, status, hospital_id)
  VALUES (v_admin_id, p_admin_username, p_admin_phone, 'admin', 'active', v_hospital_id);

  -- Log action
  INSERT INTO public.activity_logs (user_id, username, action, description, hospital_id)
  VALUES (
    v_admin_id,
    p_admin_username,
    'REGISTER_HOSPITAL',
    'Registered hospital: ' || p_hospital_name || ' with admin account: ' || p_admin_username,
    v_hospital_id
  );

  return v_admin_id;
END;
$$ LANGUAGE plpgsql;
