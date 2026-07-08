import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLogin } from "@/lib/medbay-store";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const loginMutation = useLogin();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!username.trim() || !pin.trim()) {
      setErr("Username and PIN are required.");
      return;
    }
    try {
      await loginMutation.mutateAsync({
        username: username.trim(),
        pin: pin.trim(),
      });
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Failed to login.";
      setErr(errMsg);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: brand */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-serif text-2xl">MedBay</span>
        </div>
        <div className="relative z-10">
          <h1 className="font-serif text-5xl leading-tight">
            Care that begins <br />
            with knowing the patient.
          </h1>
          <p className="mt-6 max-w-md text-primary-foreground/80">
            A calm, patient-first management system for the ward. Register once, retrieve in
            seconds.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} MedBay · Final year project
        </div>
        {/* decorative sage arc */}
        <div className="absolute -right-40 -bottom-40 h-[520px] w-[520px] rounded-full bg-accent/30 blur-3xl" />
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <Logo />
            <span className="font-serif text-2xl text-primary">MedBay</span>
          </div>
          <h2 className="font-serif text-3xl text-primary">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your globally unique staff username and PIN.
          </p>

          <div className="mt-8 space-y-4">
            <Field label="Username">
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. admin"
              />
            </Field>

            <Field label="PIN">
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••"
              />
            </Field>

            {err && <p className="text-sm text-destructive">{err}</p>}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </button>

            <div className="text-center text-xs text-muted-foreground mt-4">
              New to MedBay?{" "}
              <Link to="/register" className="text-accent hover:underline font-medium">
                Register your hospital
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  helpText,
  children,
}: {
  label: string;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {helpText && (
        <p className="text-[10px] text-muted-foreground mt-1 leading-normal">{helpText}</p>
      )}
    </label>
  );
}

function Logo() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-serif text-lg">
      M
    </span>
  );
}
