import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export type Role = "admin" | "staff";

export interface User {
  id: string;
  username: string;
  phone: string;
  role: Role;
  status?: "active" | "inactive";
  createdAt: string;
  hospitalId: string;
  hospitalSlug: string;
  hospitalName: string;
}

export interface Patient {
  id: string; // e.g. MB-2026-0001
  firstName: string;
  lastName: string;
  phone: string;
  bloodType: string;
  nextOfKin: string;
  nextOfKinPhone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  note: string;
  by?: string;
  byUserId?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  staffId?: string;
  date: string; // ISO date
  time: string; // HH:mm
  reason?: string;
  status: "scheduled" | "completed" | "cancelled";
}

export interface Shift {
  id: string;
  staffId: string;
  date: string; // ISO date
  shift: "morning" | "afternoon" | "night";
  note?: string;
}

// Compatibility hook stub (no-op since Query handles updates)
export function useDBTick(): number {
  return 0;
}

/* ---------------- Auth Hooks ---------------- */

export function useSessionUser() {
  return useQuery<User | null>({
    queryKey: ["session"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*, hospitals(name, slug)")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !profile) {
        // Fallback for newly created admin or users without profiles (e.g. metadata only)
        const parts = user.email?.split("@") || [];
        const username = parts[0] || "user";
        const domainParts = parts[1]?.split(".") || [];
        const hospitalSlug =
          domainParts.length > 2 ? domainParts[domainParts.length - 3] : "default";

        return {
          id: user.id,
          username,
          phone: "",
          role: "admin",
          createdAt: user.created_at,
          hospitalId: "00000000-0000-0000-0000-000000000000",
          hospitalSlug,
          hospitalName: "MedBay Hospital",
        };
      }

      const h = (profile as unknown as { hospitals: { name: string; slug: string } | null })
        .hospitals;
      return {
        id: profile.id,
        username: profile.username,
        phone: profile.phone || "",
        role: profile.role as Role,
        status: profile.status,
        createdAt: profile.created_at,
        hospitalId: profile.hospital_id,
        hospitalSlug: h?.slug || "default",
        hospitalName: h?.name || "MedBay Hospital",
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ username, pin }: { username: string; pin: string }) => {
      const email = `${username.toLowerCase().trim()}@medbay.local`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pin.trim(),
      });
      if (error) {
        throw new Error(
          error.message === "Invalid login credentials" ? "Wrong username or PIN." : error.message,
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      return data.user;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      queryClient.setQueryData(["session"], null);
      queryClient.clear();
    },
  });
}

/* ---------------- Patients Hooks ---------------- */

export function usePatients(q: string = "") {
  return useQuery<Patient[]>({
    queryKey: ["patients", q],
    queryFn: async () => {
      let query = supabase.from("patients").select("*");
      const term = q.trim();
      if (term) {
        query = query.or(
          `id.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%`,
        );
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      return (data || []).map((p) => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        phone: p.phone,
        bloodType: p.blood_type,
        nextOfKin: p.next_of_kin,
        nextOfKinPhone: p.next_of_kin_phone || "",
        dob: p.dob || "",
        gender: p.gender || "",
        address: p.address || "",
        notes: p.notes || "",
        createdAt: p.created_at,
        createdBy: p.created_by,
      }));
    },
  });
}

export function usePatient(id: string) {
  return useQuery<Patient | null>({
    queryKey: ["patient", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone,
        bloodType: data.blood_type,
        nextOfKin: data.next_of_kin,
        nextOfKinPhone: data.next_of_kin_phone || "",
        dob: data.dob || "",
        gender: data.gender || "",
        address: data.address || "",
        notes: data.notes || "",
        createdAt: data.created_at,
        createdBy: data.created_by,
      };
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patient: Omit<Patient, "id" | "createdAt">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("patients")
        .insert({
          first_name: patient.firstName,
          last_name: patient.lastName,
          phone: patient.phone,
          blood_type: patient.bloodType,
          next_of_kin: patient.nextOfKin,
          next_of_kin_phone: patient.nextOfKinPhone || null,
          dob: patient.dob || null,
          gender: patient.gender || null,
          address: patient.address || null,
          notes: patient.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Patient> }) => {
      const mappedPatch: Record<string, unknown> = {};
      if (patch.firstName !== undefined) mappedPatch.first_name = patch.firstName;
      if (patch.lastName !== undefined) mappedPatch.last_name = patch.lastName;
      if (patch.phone !== undefined) mappedPatch.phone = patch.phone;
      if (patch.bloodType !== undefined) mappedPatch.blood_type = patch.bloodType;
      if (patch.nextOfKin !== undefined) mappedPatch.next_of_kin = patch.nextOfKin;
      if (patch.nextOfKinPhone !== undefined)
        mappedPatch.next_of_kin_phone = patch.nextOfKinPhone || null;
      if (patch.dob !== undefined) mappedPatch.dob = patch.dob || null;
      if (patch.gender !== undefined) mappedPatch.gender = patch.gender || null;
      if (patch.address !== undefined) mappedPatch.address = patch.address || null;
      if (patch.notes !== undefined) mappedPatch.notes = patch.notes || null;

      const { data, error } = await supabase
        .from("patients")
        .update(mappedPatch)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", data.id] });
    },
  });
}

/* ---------------- Visits Hooks ---------------- */

export function useVisits(patientId: string) {
  return useQuery<Visit[]>({
    queryKey: ["visits", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from("visits")
        .select("*")
        .eq("patient_id", patientId)
        .order("date", { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map((v) => ({
        id: v.id,
        patientId: v.patient_id,
        date: v.date,
        note: v.note,
        by: v.by_username || "Staff",
        byUserId: v.by_user_id || "",
      }));
    },
    enabled: !!patientId,
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      patientId,
      note,
      by,
    }: {
      patientId: string;
      note: string;
      by?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("visits")
        .insert({
          patient_id: patientId,
          note,
          by_user_id: user?.id,
          by_username: by,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["visits", variables.patientId] });
    },
  });
}

/* ---------------- Appointments Hooks ---------------- */

export function useAppointments(date?: string) {
  return useQuery<Appointment[]>({
    queryKey: ["appointments", date],
    queryFn: async () => {
      let query = supabase.from("appointments").select("*");
      if (date) {
        query = query.eq("date", date);
      }
      const { data, error } = await query.order("time", { ascending: true });
      if (error) throw new Error(error.message);

      return (data || []).map((a) => ({
        id: a.id,
        patientId: a.patient_id,
        staffId: a.staff_id || "",
        date: a.date,
        time: a.time.slice(0, 5), // Format to HH:mm
        reason: a.reason || "",
        status: a.status as Appointment["status"],
      }));
    },
  });
}

export function useAppointmentsForPatient(patientId: string) {
  return useQuery<Appointment[]>({
    queryKey: ["appointments", "patient", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", patientId)
        .order("date", { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map((a) => ({
        id: a.id,
        patientId: a.patient_id,
        staffId: a.staff_id || "",
        date: a.date,
        time: a.time.slice(0, 5),
        reason: a.reason || "",
        status: a.status as Appointment["status"],
      }));
    },
    enabled: !!patientId,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appt: Omit<Appointment, "id" | "status">) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: appt.patientId,
          staff_id: appt.staffId || null,
          date: appt.date,
          time: appt.time,
          reason: appt.reason || null,
          status: "scheduled",
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes("That slot is already booked")) {
          throw new Error("That slot is already booked for this staff member.");
        }
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", data.date] });
      queryClient.invalidateQueries({ queryKey: ["appointments", "patient", data.patient_id] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Appointment> }) => {
      const mappedPatch: Record<string, unknown> = {};
      if (patch.status !== undefined) mappedPatch.status = patch.status;
      if (patch.reason !== undefined) mappedPatch.reason = patch.reason;
      if (patch.staffId !== undefined) mappedPatch.staff_id = patch.staffId || null;
      if (patch.date !== undefined) mappedPatch.date = patch.date;
      if (patch.time !== undefined) mappedPatch.time = patch.time;

      const { data, error } = await supabase
        .from("appointments")
        .update(mappedPatch)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", data.date] });
      queryClient.invalidateQueries({ queryKey: ["appointments", "patient", data.patient_id] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: existing, error: fetchErr } = await supabase
        .from("appointments")
        .select("date, patient_id")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr) throw new Error(fetchErr.message);

      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw new Error(error.message);

      return existing;
    },
    onSuccess: (existing) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      if (existing) {
        queryClient.invalidateQueries({ queryKey: ["appointments", existing.date] });
        queryClient.invalidateQueries({
          queryKey: ["appointments", "patient", existing.patient_id],
        });
      }
    },
  });
}

/* ---------------- Shifts Hooks ---------------- */

export function useShifts(startDate?: string, endDate?: string) {
  return useQuery<Shift[]>({
    queryKey: ["shifts", startDate, endDate],
    queryFn: async () => {
      let query = supabase.from("shifts").select("*");
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);
      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return (data || []).map((s) => ({
        id: s.id,
        staffId: s.staff_id,
        date: s.date,
        shift: s.shift as Shift["shift"],
        note: s.note || "",
      }));
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shift: Omit<Shift, "id">) => {
      const { data, error } = await supabase
        .from("shifts")
        .insert({
          staff_id: shift.staffId,
          date: shift.date,
          shift: shift.shift,
          note: shift.note || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

/* ---------------- Staff Management Hooks ---------------- */

export function useStaffList() {
  return useQuery<User[]>({
    queryKey: ["staffList"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, hospitals(name, slug)")
        .order("username", { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []).map((p) => {
        const h = (p as unknown as { hospitals: { name: string; slug: string } | null }).hospitals;
        return {
          id: p.id,
          username: p.username,
          phone: p.phone || "",
          role: p.role as Role,
          status: p.status,
          createdAt: p.created_at,
          hospitalId: p.hospital_id,
          hospitalSlug: h?.slug || "default",
          hospitalName: h?.name || "MedBay Hospital",
        };
      });
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (staff: { username: string; phone: string; pin: string }) => {
      const { data, error } = await supabase.rpc("admin_create_staff", {
        p_username: staff.username.trim(),
        p_phone: staff.phone.trim(),
        p_pin: staff.pin.trim(),
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { username: string; phone: string; pin: string };
    }) => {
      const { error } = await supabase.rpc("admin_update_staff", {
        p_staff_id: id,
        p_username: patch.username.trim(),
        p_phone: patch.phone.trim(),
        p_pin: patch.pin ? patch.pin.trim() : null,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_staff", {
        p_staff_id: id,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
    },
  });
}

/* ---------------- Activity Logs Hook ---------------- */

export function useActivityLogs() {
  return useQuery({
    queryKey: ["activityLogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20);

      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}
