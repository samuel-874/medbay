import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAppointments,
  usePatients,
  useStaffList,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
} from "@/lib/medbay-store";

export const Route = createFileRoute("/_authed/appointments")({
  component: AppointmentsPage,
});

const HOURS = Array.from({ length: 10 }, (_, i) => {
  const h = 8 + i; // 8:00 – 17:00
  return `${String(h).padStart(2, "0")}:00`;
});

function AppointmentsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ patientId: "", time: "09:00", reason: "", staffId: "" });
  const [err, setErr] = useState<string | null>(null);

  const { data: appointments = [], isLoading: isLoadingAppts } = useAppointments(date);
  const { data: patients = [], isLoading: isLoadingPatients } = usePatients("");
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaffList();

  const createAppointmentMutation = useCreateAppointment();
  const updateAppointmentMutation = useUpdateAppointment();
  const deleteAppointmentMutation = useDeleteAppointment();

  const isLoading = isLoadingAppts || isLoadingPatients || isLoadingStaff;

  const dayAppts = appointments;
  const takenTimes = new Set(dayAppts.filter((a) => a.status === "scheduled").map((a) => a.time));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.patientId) return setErr("Choose a patient.");
    try {
      await createAppointmentMutation.mutateAsync({
        patientId: form.patientId,
        date,
        time: form.time,
        reason: form.reason,
        staffId: form.staffId || undefined,
      });
      setForm({ patientId: "", time: "09:00", reason: "", staffId: "" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not book.");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-3 w-16 bg-muted rounded"></div>
            <div className="h-9 w-48 bg-muted rounded"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded"></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-soft p-6 lg:col-span-2 h-64 bg-card"></div>
          <div className="card-soft p-6 h-80 bg-card"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Schedule</p>
          <h1 className="font-serif text-4xl text-primary mt-1">Appointments</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-auto rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-soft p-6 lg:col-span-2">
          <h2 className="font-serif text-xl text-primary mb-4">
            {new Date(date + "T00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          {dayAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No appointments on this day.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {dayAppts.map((a) => {
                const p = patients.find((x) => x.id === a.patientId);
                const staff = staffList.find((u) => u.id === a.staffId);
                return (
                  <li
                    key={a.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 font-mono text-sm text-primary shrink-0">{a.time}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p ? `${p.firstName} ${p.lastName}` : "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {a.reason || "—"} {staff && `· ${staff.username}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                      <span
                        className={
                          "text-[10px] uppercase tracking-wider rounded px-2 py-0.5 " +
                          (a.status === "scheduled"
                            ? "bg-accent/10 text-accent"
                            : a.status === "completed"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground line-through")
                        }
                      >
                        {a.status}
                      </span>
                      <div className="flex gap-2">
                        {a.status === "scheduled" && (
                          <button
                            disabled={updateAppointmentMutation.isPending}
                            onClick={() =>
                              updateAppointmentMutation.mutate({
                                id: a.id,
                                patch: { status: "completed" },
                              })
                            }
                            className="text-xs text-accent hover:underline disabled:opacity-50 cursor-pointer font-medium"
                          >
                            Done
                          </button>
                        )}
                        <button
                          disabled={deleteAppointmentMutation.isPending}
                          onClick={() => deleteAppointmentMutation.mutate(a.id)}
                          className="text-xs text-destructive hover:underline disabled:opacity-50 cursor-pointer font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card-soft p-6">
          <h2 className="font-serif text-xl text-primary mb-4">Book</h2>
          <form onSubmit={submit} className="space-y-3 text-sm">
            <label className="block">
              <span className="text-xs text-muted-foreground">Patient</span>
              <select
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choose…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} · {p.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Time</span>
              <select
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h} disabled={takenTimes.has(h)}>
                    {h} {takenTimes.has(h) ? "· taken" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Staff (optional)</span>
              <select
                value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">—</option>
                {staffList
                  .filter((u) => u.role === "staff")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Reason</span>
              <input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Consultation…"
              />
            </label>
            {err && <p className="text-xs text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={createAppointmentMutation.isPending}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {createAppointmentMutation.isPending ? "Booking..." : "Book appointment"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
