import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLogin } from "@/lib/medbay-store";
import { supabase } from "@/lib/supabase";
import { Building2, User, KeyRound, Phone, MapPin, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  ssr: false,
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();

  // Form states
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalSlug, setHospitalSlug] = useState("");
  const [hospitalPhone, setHospitalPhone] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");

  const [adminUsername, setAdminUsername] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate form fields
  function validateForm(): boolean {
    if (!hospitalName.trim()) {
      setErr("Hospital Name is required.");
      return false;
    }
    if (!hospitalSlug.trim()) {
      setErr("Hospital Code is required.");
      return false;
    }
    // Check if hospital slug contains spaces or special characters
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(hospitalSlug.trim().toLowerCase())) {
      setErr(
        "Hospital Code must contain only lowercase letters, numbers, and hyphens (no spaces).",
      );
      return false;
    }
    if (!adminUsername.trim()) {
      setErr("Administrator Username is required.");
      return false;
    }
    if (adminUsername.includes("@") || adminUsername.includes(" ")) {
      setErr("Administrator Username cannot contain spaces or '@' symbol.");
      return false;
    }
    if (!adminPin.trim()) {
      setErr("Administrator PIN is required.");
      return false;
    }
    if (adminPin.length < 4) {
      setErr("PIN must be at least 4 characters.");
      return false;
    }
    if (adminPin !== confirmPin) {
      setErr("PINs do not match.");
      return false;
    }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Call database RPC function to register hospital & admin
      const { data: adminId, error: registerError } = await supabase.rpc("register_hospital", {
        p_hospital_name: hospitalName.trim(),
        p_hospital_slug: hospitalSlug.trim().toLowerCase(),
        p_hospital_phone: hospitalPhone.trim() || null,
        p_hospital_address: hospitalAddress.trim() || null,
        p_admin_username: adminUsername.trim().toLowerCase(),
        p_admin_phone: adminPhone.trim() || null,
        p_admin_pin: adminPin.trim(),
      });

      if (registerError) {
        throw new Error(registerError.message);
      }

      if (!adminId) {
        throw new Error("Registration returned an empty response.");
      }

      setSuccess(true);

      // 2. Perform automatic login for a premium seamless onboarding experience
      await loginMutation.mutateAsync({
        username: adminUsername.trim().toLowerCase(),
        pin: adminPin.trim(),
      });

      // 3. Redirect to dashboard
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Failed to register hospital.";
      setErr(errMsg);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-background text-foreground">
      {/* Left Column: Premium Branding Sidebar */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="flex items-center gap-2 relative z-10">
          <Logo />
          <span className="font-serif text-2xl">MedBay</span>
        </div>
        <div className="relative z-10 my-auto">
          <h1 className="font-serif text-5xl leading-tight">
            Bring MedBay <br />
            to your ward.
          </h1>
          <p className="mt-6 max-w-sm text-primary-foreground/80 text-sm leading-relaxed">
            Register your healthcare facility in seconds. Manage your staff shifts, duty rosters,
            patient records, and consultations in a single secure, HIPAA-compliant system.
          </p>

          <div className="mt-12 space-y-4 max-w-sm">
            <div className="flex gap-3 items-start">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground text-xs font-semibold">
                1
              </span>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                  Establish Workspace
                </h4>
                <p className="text-xs text-primary-foreground/75 mt-0.5">
                  Define your hospital name and a unique login code.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground text-xs font-semibold">
                2
              </span>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                  Create Admin Profile
                </h4>
                <p className="text-xs text-primary-foreground/75 mt-0.5">
                  Set up the default administrator account simultaneously.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground text-xs font-semibold">
                3
              </span>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                  Invite Your Staff
                </h4>
                <p className="text-xs text-primary-foreground/75 mt-0.5">
                  Log in and invite your medical staff to start onboarding patients.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-primary-foreground/60 relative z-10">
          © {new Date().getFullYear()} MedBay · Final year project
        </div>
        {/* Sage-green blurry background blob */}
        <div className="absolute -left-20 -bottom-20 h-[500px] w-[500px] rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/* Right Column: Registration Form Container */}
      <div className="lg:col-span-7 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-20 bg-background overflow-y-auto max-h-screen">
        <div className="w-full max-w-xl mx-auto space-y-8">
          <div className="space-y-2">
            <div className="lg:hidden flex items-center gap-2 mb-4">
              <Logo />
              <span className="font-serif text-2xl text-primary">MedBay</span>
            </div>
            <h2 className="font-serif text-4xl text-primary font-medium tracking-tight">
              Register Hospital
            </h2>
            <p className="text-sm text-muted-foreground">
              Create a new secure, multi-tenant workspace for your medical staff.
            </p>
          </div>

          {success ? (
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 text-accent-foreground">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <h3 className="font-medium text-lg">Hospital Registered Successfully!</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                We have registered your hospital. Setting up your workspace and signing you in as
                administrative user{" "}
                <code className="bg-secondary/50 px-1.5 py-0.5 rounded font-mono text-foreground font-semibold">
                  {adminUsername}
                </code>
                . Please wait...
              </p>
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-8">
              {/* SECTION 1: Hospital Details */}
              <div className="space-y-4 p-5 rounded-xl bg-card border border-border/80 shadow-sm relative">
                <div className="absolute -top-3 left-4 px-3 py-0.5 bg-primary text-primary-foreground text-[10px] uppercase font-bold tracking-widest rounded-full flex items-center gap-1.5 shadow-sm">
                  <Building2 className="h-3 w-3" />
                  Hospital Profile
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-2">
                  <Field label="Hospital Name" required>
                    <input
                      required
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      placeholder="e.g. Sacred Heart Hospital"
                    />
                  </Field>

                  <Field
                    label="Hospital Code (Slug)"
                    required
                    helpText="Used for staff log-in & patient IDs. Lowercase, numbers, and hyphens only."
                  >
                    <div className="relative flex items-center">
                      <input
                        required
                        value={hospitalSlug}
                        onChange={(e) =>
                          setHospitalSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all pr-20"
                        placeholder="e.g. sacred-heart"
                      />
                      <span className="absolute right-2 px-2 py-1 rounded bg-secondary text-[10px] uppercase font-mono font-bold text-muted-foreground select-none">
                        .{hospitalSlug || "slug"}
                      </span>
                    </div>
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Hospital Phone">
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="tel"
                        value={hospitalPhone}
                        onChange={(e) => setHospitalPhone(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="e.g. +1 (555) 019-2834"
                      />
                    </div>
                  </Field>

                  <Field label="Hospital Address">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        value={hospitalAddress}
                        onChange={(e) => setHospitalAddress(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="e.g. 100 Medical Plaza, CA"
                      />
                    </div>
                  </Field>
                </div>
              </div>

              {/* SECTION 2: Admin Account */}
              <div className="space-y-4 p-5 rounded-xl bg-card border border-border/80 shadow-sm relative">
                <div className="absolute -top-3 left-4 px-3 py-0.5 bg-accent text-accent-foreground text-[10px] uppercase font-bold tracking-widest rounded-full flex items-center gap-1.5 shadow-sm">
                  <User className="h-3 w-3" />
                  Default Administrator Account
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-2">
                  <Field
                    label="Admin Username"
                    required
                    helpText="Staff username used for logging in."
                  >
                    <input
                      required
                      value={adminUsername}
                      onChange={(e) =>
                        setAdminUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                      placeholder="e.g. admin"
                    />
                  </Field>

                  <Field label="Admin Contact Phone">
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="tel"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="e.g. +1 (555) 012-3456"
                      />
                    </div>
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Admin PIN"
                    required
                    helpText="Enter a numeric login PIN (min 4 digits)."
                  >
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        required
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ""))}
                        className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="••••"
                      />
                    </div>
                  </Field>

                  <Field label="Confirm PIN" required>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        required
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                        className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        placeholder="••••"
                      />
                    </div>
                  </Field>
                </div>
              </div>

              {err && (
                <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20 animate-in fade-in duration-200">
                  {err}
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm font-semibold hover:shadow"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                      Creating workspace...
                    </>
                  ) : (
                    <>
                      Register Workspace
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center text-sm text-muted-foreground">
                  Already registered?{" "}
                  <Link to="/login" className="text-accent hover:underline font-medium">
                    Sign in to your hospital
                  </Link>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  helpText,
  children,
}: {
  label: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          {label}
          {required && <span className="text-destructive font-bold">*</span>}
        </span>
      </label>
      {children}
      {helpText && (
        <p className="text-[10px] text-muted-foreground leading-normal mt-1">{helpText}</p>
      )}
    </div>
  );
}

function Logo() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground font-serif text-lg">
      M
    </span>
  );
}
