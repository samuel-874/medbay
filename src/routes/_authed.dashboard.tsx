import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useSessionUser,
  usePatients,
  useAppointments,
  useShifts,
  useStaffList,
} from "@/lib/medbay-store";

export const Route = createFileRoute("/_authed/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: user } = useSessionUser();
  const { data: patients = [], isLoading: isLoadingPatients } = usePatients("");
  const { data: appointments = [], isLoading: isLoadingAppts } = useAppointments(today);
  const { data: shifts = [], isLoading: isLoadingShifts } = useShifts(today, today);
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaffList();

  const isLoading = isLoadingPatients || isLoadingAppts || isLoadingShifts || isLoadingStaff;

  const todayAppts = appointments.filter((a) => a.status === "scheduled");
  const recentPatients = patients.slice(0, 5);
  const onDuty = shifts;

  const stats = [
    { label: "Patients", value: patients.length },
    { label: "Appts today", value: todayAppts.length },
    { label: "Staff on duty", value: onDuty.length },
    { label: "Staff total", value: staffList.filter((u) => u.role === "staff").length },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-4 w-24 bg-muted rounded"></div>
          <div className="h-8 w-48 bg-muted rounded mt-2"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-soft p-5 space-y-3">
              <div className="h-3 w-16 bg-muted rounded"></div>
              <div className="h-7 w-10 bg-muted rounded"></div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-soft p-6 lg:col-span-2 space-y-4">
            <div className="h-5 w-36 bg-muted rounded"></div>
            <div className="space-y-3 pt-2">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>

          <div className="card-soft p-6 space-y-4">
            <div className="h-5 w-24 bg-muted rounded"></div>
            <div className="space-y-3 pt-2">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="font-serif text-4xl text-primary mt-1">
          Good {greet()}, {user?.username}.
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card-soft p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-serif text-3xl text-primary">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-soft p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-primary">Today's appointments</h2>
            <Link to="/appointments" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
          {todayAppts.length === 0 ? (
            <Empty text="No appointments scheduled for today." />
          ) : (
            <ul className="divide-y divide-border">
              {todayAppts.map((a) => {
                const p = patients.find((x) => x.id === a.patientId);
                return (
                  <li key={a.id} className="py-3 flex items-center gap-4">
                    <div className="w-14 shrink-0 text-sm font-medium text-primary">{a.time}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {p ? `${p.firstName} ${p.lastName}` : "Unknown patient"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.reason || "—"}
                      </div>
                    </div>
                    {p && (
                      <Link
                        to="/patients/$id"
                        params={{ id: p.id }}
                        className="text-xs text-accent hover:underline"
                      >
                        Open
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-primary">New patients</h2>
            <Link to="/patients/new" className="text-xs text-accent hover:underline">
              + Register
            </Link>
          </div>
          {recentPatients.length === 0 ? (
            <Empty text="No patients yet." />
          ) : (
            <ul className="space-y-3">
              {recentPatients.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/patients/$id"
                    params={{ id: p.id }}
                    className="flex items-center justify-between rounded-lg px-3 py-2 -mx-3 hover:bg-secondary/60"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {p.firstName} {p.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{p.id}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-accent bg-accent/10 rounded px-2 py-0.5">
                      {p.bloodType || "?"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
