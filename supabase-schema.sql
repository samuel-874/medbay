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

DROP FUNCTION IF EXISTS generate_patient_id CASCADE;
DROP FUNCTION IF EXISTS check_appointment_clash CASCADE;
DROP FUNCTION IF EXISTS admin_create_staff CASCADE;
DROP FUNCTION IF EXISTS admin_update_staff CASCADE;
DROP FUNCTION IF EXISTS admin_delete_staff CASCADE;

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('admin', 'staff')),
  status text NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow admins to insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete profiles" ON profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Patients Table
CREATE TABLE patients (
  id text PRIMARY KEY, -- Custom format: MB-YYYY-NNNN
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

-- Trigger to Automatically Generate Patient ID (MB-YYYY-NNNN)
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TRIGGER AS $$
DECLARE
  current_yr text;
  next_num integer;
  formatted_id text;
BEGIN
  current_yr := to_char(now(), 'YYYY');
  
  -- Find the maximum current suffix counter for the current year
  SELECT COALESCE(MAX(SUBSTRING(id FROM 9)::integer), 0)
  INTO next_num
  FROM patients
  WHERE id LIKE 'MB-' || current_yr || '-%';

  next_num := next_num + 1;
  formatted_id := 'MB-' || current_yr || '-' || lpad(next_num::text, 4, '0');
  NEW.id := formatted_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_patient_id
BEFORE INSERT ON patients
FOR EACH ROW
WHEN (NEW.id IS NULL OR NEW.id = '')
EXECUTE FUNCTION generate_patient_id();

-- Enable RLS on Patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to patients" ON patients
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. Visits Table (Consultation notes / logs)
CREATE TABLE visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id text NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date timestamp with time zone DEFAULT now(),
  note text NOT NULL,
  by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  by_username text
);

-- Enable RLS on Visits
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to visits" ON visits
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Appointments Table
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id text NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  date date NOT NULL,
  time time NOT NULL,
  reason text,
  status text NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at timestamp with time zone DEFAULT now()
);

-- Trigger to Prevent Double Booking of the same doctor/time slot
CREATE OR REPLACE FUNCTION check_appointment_clash()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE date = NEW.date
      AND time = NEW.time
      AND status = 'scheduled'
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

-- Enable RLS on Appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to appointments" ON appointments
  FOR ALL USING (auth.role() = 'authenticated');

-- 5. Shifts Table (Duty Schedules)
CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('morning', 'afternoon', 'night')),
  note text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read shifts" ON shifts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage shifts" ON shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Activity Logs Table
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username text,
  action text NOT NULL,
  description text,
  timestamp timestamp with time zone DEFAULT now()
);

-- Enable RLS on Activity Logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins access to logs" ON activity_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Admin RPC Helpers (Security Definer functions running as database owner)

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
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can create staff accounts.';
  END IF;

  v_email := lower(p_username) || '@medbay.local';

  -- Check username conflict
  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE username = p_username
  ) THEN
    RAISE EXCEPTION 'Username already exists.';
  END IF;

  -- Insert user into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, crypt(p_pin, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  )
  RETURNING id INTO v_user_id;

  -- Create profile record
  INSERT INTO public.profiles (id, username, phone, role, status)
  VALUES (v_user_id, p_username, p_phone, 'staff', 'active');

  -- Log administrative activity
  INSERT INTO public.activity_logs (user_id, username, action, description)
  VALUES (
    auth.uid(),
    (SELECT username FROM public.profiles WHERE id = auth.uid()),
    'CREATE_STAFF',
    'Created staff account for ' || p_username
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
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can update staff accounts.';
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
  INSERT INTO public.activity_logs (user_id, username, action, description)
  VALUES (
    auth.uid(),
    (SELECT username FROM public.profiles WHERE id = auth.uid()),
    'UPDATE_STAFF',
    'Updated staff account details for ' || p_username
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
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can delete staff accounts.';
  END IF;

  -- Prevent self deletion
  IF p_staff_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own administrator account.';
  END IF;

  SELECT username INTO v_staff_username FROM public.profiles WHERE id = p_staff_id;

  -- Deleting the user from auth.users cascades to public.profiles
  DELETE FROM auth.users WHERE id = p_staff_id;

  -- Log action
  INSERT INTO public.activity_logs (user_id, username, action, description)
  VALUES (
    auth.uid(),
    (SELECT username FROM public.profiles WHERE id = auth.uid()),
    'DELETE_STAFF',
    'Deleted staff account: ' || COALESCE(v_staff_username, p_staff_id::text)
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Seed Default Admin Account
-- Username: admin, PIN: 1234
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Check if the auth user already exists
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@medbay.local';

  IF v_admin_id IS NULL THEN
    -- Generate new ID and insert user
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'admin@medbay.local', crypt('1234', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', ''
    );
  ELSE
    -- Fix any NULL values in existing auth user row that cause GoTrue 500 error
    UPDATE auth.users
    SET confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, '')
    WHERE id = v_admin_id;
  END IF;

  -- Ensure profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id) THEN
    -- Clean up any existing profile with username 'admin' to avoid unique constraints
    DELETE FROM public.profiles WHERE username = 'admin';

    INSERT INTO public.profiles (id, username, phone, role, status)
    VALUES (v_admin_id, 'admin', '0000000000', 'admin', 'active');
  END IF;
END $$;
