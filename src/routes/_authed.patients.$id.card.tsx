import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { usePatient } from "@/lib/medbay-store";

export const Route = createFileRoute("/_authed/patients/$id/card")({
  component: CardPage,
});

function CardPage() {
  const { id } = Route.useParams();
  const { data: patient, isLoading } = usePatient(id);

  if (isLoading) {
    return (
      <div className="space-y-6 flex flex-col items-center py-12 animate-pulse">
        <div className="w-[420px] max-w-full h-80 bg-muted/20 rounded-2xl border border-border"></div>
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

  const qrPayload = JSON.stringify({
    id: patient.id,
    name: `${patient.firstName} ${patient.lastName}`,
    blood: patient.bloodType,
  });

  return (
    <div className="space-y-6">
      <div className="print:hidden flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link
            to="/patients/$id"
            params={{ id: patient.id }}
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Back to patient
          </Link>
          <h1 className="font-serif text-4xl text-primary mt-2">Patient ID card</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Print card
        </button>
      </div>

      <div className="flex justify-center py-6">
        <div className="mb-card w-[420px] max-w-full shrink-0 overflow-hidden rounded-2xl shadow-xl">
          {/* Front */}
          <div className="relative bg-primary text-primary-foreground p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-serif text-lg">
                  M
                </span>
                <div>
                  <div className="font-serif text-lg leading-none">MedBay</div>
                  <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">
                    Patient card
                  </div>
                </div>
              </div>
              <span className="rounded-md bg-accent/30 px-2 py-1 text-[10px] uppercase tracking-widest">
                {patient.bloodType || "—"}
              </span>
            </div>

            <div className="mt-8 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">
                  Patient
                </div>
                <div className="font-serif text-2xl leading-tight truncate">
                  {patient.firstName} {patient.lastName}
                </div>
                <div className="mt-2 font-mono text-sm text-primary-foreground/80">
                  {patient.id}
                </div>
              </div>
              <div className="rounded-md bg-white p-1.5 shrink-0">
                <QRCodeSVG value={qrPayload} size={72} level="M" />
              </div>
            </div>

            {/* decorative */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/20 blur-2xl" />
          </div>

          {/* Back */}
          <div className="bg-card p-6 text-sm space-y-3">
            <Row label="Phone" value={patient.phone} />
            <Row label="Date of birth" value={patient.dob || "—"} />
            <Row label="Next of kin" value={patient.nextOfKin || "—"} />
            <Row label="NoK phone" value={patient.nextOfKinPhone || "—"} />
            <div className="pt-3 mt-2 border-t border-border text-[10px] uppercase tracking-widest text-muted-foreground text-center">
              If found, please return to MedBay reception
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .mb-card { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}
