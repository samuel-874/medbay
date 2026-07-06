import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  usePatient,
  useVisits,
  useCreateVisit,
  useUpdatePatient,
  useAppointmentsForPatient,
  useUpdateAppointment,
  useStaffList,
  useSessionUser,
  type Appointment,
  type Patient,
} from "@/lib/medbay-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { CalendarDays, Clock, User, FileText, AlertCircle, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authed/patients/$id/")({
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = Route.useParams();
  const { data: user } = useSessionUser();
  const { data: patient, isLoading: isLoadingPatient } = usePatient(id);
  const { data: visits = [], isLoading: isLoadingVisits } = useVisits(id);
  const { data: appointments = [], isLoading: isLoadingAppts } = useAppointmentsForPatient(id);
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaffList();

  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const updateApptMutation = useUpdateAppointment();
  const createVisitMutation = useCreateVisit();

  const isLoading = isLoadingPatient || isLoadingVisits || isLoadingAppts || isLoadingStaff;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-muted rounded"></div>
          <div className="h-9 w-64 bg-muted rounded"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="card-soft p-6 h-48 bg-muted/10"></div>
            <div className="card-soft p-6 h-64 bg-muted/10"></div>
            <div className="card-soft p-6 h-48 bg-muted/10"></div>
          </div>
          <div className="space-y-4">
            <div className="card-soft p-6 h-20 bg-muted/10"></div>
            <div className="card-soft p-6 h-20 bg-muted/10"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="card-soft p-10 text-center">
        <p className="text-muted-foreground">Patient not found.</p>
        <Link to="/patients" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to patients →
        </Link>
      </div>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // Group appointments
  // Upcoming: scheduled, date is today or later
  const upcomingAppts = appointments
    .filter((a) => a.status === "scheduled" && (a.date > todayStr || a.date === todayStr))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  // Past: completed, cancelled, or scheduled but date is in the past (overdue)
  const pastAppts = appointments
    .filter(
      (a) =>
        a.status === "completed" ||
        a.status === "cancelled" ||
        (a.status === "scheduled" && a.date < todayStr),
    )
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/patients" className="text-xs text-muted-foreground hover:underline">
            ← Patients
          </Link>
          <h1 className="font-serif text-4xl text-primary mt-2">
            {patient.firstName} {patient.lastName}
          </h1>
          <div className="mt-1 text-sm text-muted-foreground font-mono">{patient.id}</div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/patients/$id/card"
            params={{ id: patient.id }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            View ID card
          </Link>
          <button
            onClick={() => setEditing((e) => !e)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Bio-data */}
          <section className="card-soft p-6">
            <h2 className="font-serif text-xl text-primary mb-4">Bio-data</h2>
            {editing ? (
              <EditForm patient={patient} onDone={() => setEditing(false)} />
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Info label="Phone" value={patient.phone} />
                <Info label="Blood type" value={patient.bloodType} />
                <Info label="Date of birth" value={patient.dob || "—"} />
                <Info label="Gender" value={patient.gender || "—"} />
                <Info label="Address" value={patient.address || "—"} />
                <Info label="Notes" value={patient.notes || "—"} />
                <Info label="Next of kin" value={patient.nextOfKin || "—"} />
                <Info label="NoK phone" value={patient.nextOfKinPhone || "—"} />
              </dl>
            )}
          </section>

          {/* Appointments history */}
          <section className="card-soft p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h2 className="font-serif text-xl text-primary flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-accent" />
                Appointments
              </h2>
              <Link
                to="/appointments"
                className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
              >
                + Book new
              </Link>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No appointments booked for this patient.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Upcoming */}
                {upcomingAppts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/70 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Upcoming Appointments ({upcomingAppts.length})
                    </h3>
                    <ul className="divide-y divide-border border border-border/60 rounded-xl overflow-hidden bg-card/40">
                      {upcomingAppts.map((a) => {
                        const staff = staffList.find((u) => u.id === a.staffId);
                        return (
                          <li key={a.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedAppt(a)}
                              className="w-full text-left flex items-center justify-between gap-4 p-4 hover:bg-secondary/40 transition-colors focus:outline-none cursor-pointer"
                            >
                              <div className="space-y-1">
                                <div className="text-sm font-semibold text-foreground">
                                  {new Date(a.date + "T00:00").toLocaleDateString(undefined, {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}{" "}
                                  at {a.time}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <FileText className="h-3 w-3" />
                                  <span className="truncate max-w-[220px]">
                                    {a.reason || "General checkup"}
                                  </span>
                                  {staff && (
                                    <>
                                      <span>·</span>
                                      <User className="h-3 w-3" />
                                      <span>{staff.username}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 bg-accent/15 text-accent border border-accent/20">
                                  Scheduled
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Past / Inactive */}
                {pastAppts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Past & Overdue Appointments ({pastAppts.length})
                    </h3>
                    <ul className="divide-y divide-border border border-border/60 rounded-xl overflow-hidden bg-card/10">
                      {pastAppts.map((a) => {
                        const staff = staffList.find((u) => u.id === a.staffId);
                        const isOverdue = a.status === "scheduled" && a.date < todayStr;
                        return (
                          <li key={a.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedAppt(a)}
                              className="w-full text-left flex items-center justify-between gap-4 p-4 hover:bg-secondary/40 transition-colors focus:outline-none cursor-pointer"
                            >
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-foreground/80">
                                  {new Date(a.date + "T00:00").toLocaleDateString(undefined, {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}{" "}
                                  at {a.time}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <FileText className="h-3 w-3" />
                                  <span className="truncate max-w-[220px]">
                                    {a.reason || "General checkup"}
                                  </span>
                                  {staff && (
                                    <>
                                      <span>·</span>
                                      <User className="h-3 w-3" />
                                      <span>{staff.username}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 border ${
                                    isOverdue
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : a.status === "completed"
                                        ? "bg-primary/10 text-primary border-primary/20"
                                        : "bg-muted text-muted-foreground border-border/60"
                                  }`}
                                >
                                  {isOverdue ? "overdue" : a.status}
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Visit Notes */}
          <section className="card-soft p-6">
            <h2 className="font-serif text-xl text-primary mb-4">Visit notes</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                try {
                  await createVisitMutation.mutateAsync({
                    patientId: patient.id,
                    note: note.trim(),
                    by: user?.username,
                  });
                  setNote("");
                } catch (err) {
                  console.error(err);
                }
              }}
              className="flex gap-2 mb-4"
            >
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a quick note…"
                disabled={createVisitMutation.isPending}
                className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={createVisitMutation.isPending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {createVisitMutation.isPending ? "Adding..." : "Add"}
              </button>
            </form>
            {visits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No visits yet.</p>
            ) : (
              <ul className="space-y-3">
                {visits.map((v) => (
                  <li key={v.id} className="border-l-2 border-accent pl-4">
                    <div className="text-xs text-muted-foreground">
                      {new Date(v.date).toLocaleString()} {v.by && `· ${v.by}`}
                    </div>
                    <div className="text-sm mt-0.5">{v.note}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card-soft p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Registered</div>
            <div className="mt-1 text-sm">{new Date(patient.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="card-soft p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Quick actions
            </div>
            <Link to="/appointments" className="block text-sm text-accent hover:underline">
              Book appointment →
            </Link>
          </div>
        </aside>
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={selectedAppt !== null} onOpenChange={(open) => !open && setSelectedAppt(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-card border border-border shadow-xl text-foreground">
          {selectedAppt && (
            <div className="space-y-5">
              <DialogHeader className="space-y-1">
                <DialogTitle className="font-serif text-2xl text-primary">
                  Appointment Details
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  View or update status for appointment ID:{" "}
                  <span className="font-mono text-[10px] bg-secondary/50 px-1 py-0.5 rounded text-foreground">
                    {selectedAppt.id}
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Detail fields */}
              <div className="divide-y divide-border border rounded-xl bg-secondary/10 px-4 py-1 text-sm border-border/60">
                <DetailRow
                  label="Patient"
                  value={`${patient.firstName} ${patient.lastName} (${patient.id})`}
                />
                <DetailRow
                  label="Date"
                  value={new Date(selectedAppt.date + "T00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
                <DetailRow label="Time" value={selectedAppt.time} />
                <DetailRow
                  label="Doctor/Staff"
                  value={staffList.find((u) => u.id === selectedAppt.staffId)?.username || "—"}
                />
                <DetailRow
                  label="Reason / Notes"
                  value={selectedAppt.reason || "General Checkup"}
                />
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                    Status
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider rounded px-2 py-0.5 border ${
                      selectedAppt.status === "scheduled" && selectedAppt.date < todayStr
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : selectedAppt.status === "scheduled"
                          ? "bg-accent/15 text-accent border-accent/20"
                          : selectedAppt.status === "completed"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground border-border/60"
                    }`}
                  >
                    {selectedAppt.status === "scheduled" && selectedAppt.date < todayStr
                      ? "overdue"
                      : selectedAppt.status}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                {selectedAppt.status === "scheduled" && (
                  <>
                    <button
                      type="button"
                      disabled={updateApptMutation.isPending}
                      onClick={async () => {
                        await updateApptMutation.mutateAsync({
                          id: selectedAppt.id,
                          patch: { status: "cancelled" },
                        });
                        setSelectedAppt(null);
                      }}
                      className="rounded-lg border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel Appointment
                    </button>
                    <button
                      type="button"
                      disabled={updateApptMutation.isPending}
                      onClick={async () => {
                        await updateApptMutation.mutateAsync({
                          id: selectedAppt.id,
                          patch: { status: "completed" },
                        });
                        setSelectedAppt(null);
                      }}
                      className="rounded-lg bg-accent text-accent-foreground hover:opacity-90 px-4 py-2 text-xs font-semibold transition-opacity cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {updateApptMutation.isPending ? "Updating..." : "Mark Completed"}
                    </button>
                  </>
                )}
                <DialogClose className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer text-muted-foreground text-center">
                  Close
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 flex justify-between gap-4">
      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider shrink-0">
        {label}
      </span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function EditForm({ patient, onDone }: { patient: Patient; onDone: () => void }) {
  const [f, setF] = useState<Partial<Patient>>({
    phone: patient.phone,
    bloodType: patient.bloodType,
    dob: patient.dob,
    gender: patient.gender,
    address: patient.address,
    notes: patient.notes,
    nextOfKin: patient.nextOfKin,
    nextOfKinPhone: patient.nextOfKinPhone,
  });

  const updatePatientMutation = useUpdatePatient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePatientMutation.mutateAsync({ id: patient.id, patch: f });
      onDone();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      {(
        [
          ["phone", "Phone"],
          ["bloodType", "Blood type"],
          ["dob", "DOB"],
          ["gender", "Gender"],
          ["address", "Address"],
          ["notes", "Notes"],
          ["nextOfKin", "Next of kin"],
          ["nextOfKinPhone", "NoK phone"],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="block">
          <span className="text-xs text-muted-foreground">{label}</span>
          <input
            value={(f as Record<string, string>)[k] ?? ""}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      ))}
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={updatePatientMutation.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {updatePatientMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
