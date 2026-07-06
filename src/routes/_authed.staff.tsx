import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  useSessionUser,
  useStaffList,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  type User,
} from "@/lib/medbay-store";

export const Route = createFileRoute("/_authed/staff")({
  component: StaffPage,
});

function StaffPage() {
  const navigate = useNavigate();
  const { data: me, isLoading: isLoadingSession } = useSessionUser();
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaffList();

  const createStaffMutation = useCreateStaff();
  const [form, setForm] = useState({ username: "", phone: "", pin: "" });
  const [err, setErr] = useState<string | null>(null);

  const isLoading = isLoadingSession || isLoadingStaff;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-muted rounded"></div>
          <div className="h-9 w-48 bg-muted rounded"></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-soft p-6 lg:col-span-2 h-64 bg-card"></div>
          <div className="card-soft p-6 h-64 bg-card"></div>
        </div>
      </div>
    );
  }

  if (me?.role !== "admin") {
    return (
      <div className="card-soft p-10 text-center">
        <p className="text-muted-foreground">Only the admin manages staff accounts.</p>
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="mt-4 text-sm text-accent hover:underline cursor-pointer"
        >
          Back to overview →
        </button>
      </div>
    );
  }

  const staff = staffList.filter((u) => u.role === "staff");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.username || !form.pin) return setErr("Username and PIN required.");
    try {
      await createStaffMutation.mutateAsync(form);
      setForm({ username: "", phone: "", pin: "" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not add staff.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Team</p>
        <h1 className="font-serif text-4xl text-primary mt-1">Staff</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-soft p-6 lg:col-span-2">
          <h2 className="font-serif text-xl text-primary mb-4">Members</h2>
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No staff yet — add one on the right.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {staff.map((u) => (
                <StaffRow key={u.id} user={u} />
              ))}
            </ul>
          )}
        </section>

        <section className="card-soft p-6">
          <h2 className="font-serif text-xl text-primary mb-4">Add staff</h2>
          <form onSubmit={submit} className="space-y-3 text-sm" autoComplete="off">
            <FieldInput
              label="Username"
              value={form.username}
              onChange={(v) => setForm({ ...form, username: v })}
              autoComplete="off"
            />
            <FieldInput
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              autoComplete="off"
            />
            <FieldInput
              label="PIN"
              value={form.pin}
              placeholder="4-digit code"
              onChange={(v) => setForm({ ...form, pin: v })}
              type="password"
              autoComplete="new-password"
            />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={createStaffMutation.isPending}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {createStaffMutation.isPending ? "Creating..." : "Create account"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function StaffRow({ user }: { user: User }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ username: user.username, phone: user.phone, pin: "" });

  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();

  return (
    <li className="py-3">
      {edit ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-sm">
          <input
            value={f.username}
            placeholder="Username"
            onChange={(e) => setF({ ...f, username: e.target.value })}
            className="rounded-md border border-input bg-card px-2 py-1.5 focus:outline-none"
          />
          <input
            value={f.phone}
            placeholder="Phone"
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            className="rounded-md border border-input bg-card px-2 py-1.5 focus:outline-none"
          />
          <input
            value={f.pin}
            placeholder="New PIN (optional)"
            type="password"
            onChange={(e) => setF({ ...f, pin: e.target.value })}
            className="rounded-md border border-input bg-card px-2 py-1.5 focus:outline-none"
          />
          <div className="flex gap-2 justify-end pt-1 sm:pt-0">
            <button
              disabled={updateStaffMutation.isPending}
              onClick={async () => {
                try {
                  await updateStaffMutation.mutateAsync({ id: user.id, patch: f });
                  setEdit(false);
                } catch (err) {
                  console.error(err);
                }
              }}
              className="text-xs text-accent hover:underline disabled:opacity-50 cursor-pointer font-medium"
            >
              {updateStaffMutation.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEdit(false)}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-full bg-accent/15 text-accent flex items-center justify-center font-serif">
            {user.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{user.username}</div>
            <div className="text-xs text-muted-foreground">{user.phone || "—"}</div>
          </div>
          <button
            onClick={() => setEdit(true)}
            className="text-xs text-accent hover:underline cursor-pointer"
          >
            Edit
          </button>
          <button
            disabled={deleteStaffMutation.isPending}
            onClick={async () => {
              if (confirm(`Are you sure you want to delete staff account "${user.username}"?`)) {
                try {
                  await deleteStaffMutation.mutateAsync(user.id);
                } catch (err) {
                  console.error(err);
                }
              }
            }}
            className="text-xs text-destructive hover:underline disabled:opacity-50 cursor-pointer"
          >
            {deleteStaffMutation.isPending ? "Removing..." : "Remove"}
          </button>
        </div>
      )}
    </li>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
