import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";
import { usePatients } from "@/lib/medbay-store";

export const Route = createFileRoute("/_authed/patients/")({
  component: PatientsPage,
});

function PatientsPage() {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const { data: results = [], isLoading } = usePatients(deferredQ);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">People</p>
          <h1 className="font-serif text-4xl text-primary mt-1">Patients</h1>
        </div>
        <Link
          to="/patients/new"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + Register patient
        </Link>
      </div>

      <div className="card-soft p-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, ID, or phone…"
          className="w-full bg-transparent px-4 py-2.5 text-sm focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="card-soft divide-y divide-border overflow-hidden animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-3 w-48 bg-muted rounded"></div>
              </div>
              <div className="h-5 w-10 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="card-soft py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {q ? "No patients match that search." : "No patients registered yet."}
          </p>
          <Link
            to="/patients/new"
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Register the first patient →
          </Link>
        </div>
      ) : (
        <ul className="card-soft divide-y divide-border overflow-hidden">
          {results.map((p) => (
            <li key={p.id}>
              <Link
                to="/patients/$id"
                params={{ id: p.id }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/40"
              >
                <div className="h-10 w-10 rounded-full bg-accent/15 text-accent flex items-center justify-center font-serif">
                  {p.firstName[0]}
                  {p.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {p.id} · {p.phone}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-accent bg-accent/10 rounded px-2 py-0.5">
                  {p.bloodType || "?"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
