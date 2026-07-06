import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useCreatePatient } from "@/lib/medbay-store";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Phone,
  Activity,
  Heart,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  QrCode,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authed/patients/new")({
  component: NewPatient,
});

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

function NewPatient() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dob: "",
    gender: "",
    bloodType: "Unknown",
    address: "",
    nextOfKin: "",
    nextOfKinPhone: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [mockId, setMockId] = useState("");

  // Set placeholder patient ID for the preview card
  useEffect(() => {
    const year = new Date().getFullYear();
    setMockId(`MB-${year}-XXXX`);
  }, []);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    // Clear error on change
    if (errors[k]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  }

  function validateField(name: string, value: string): string | null {
    if (name === "firstName" && !value.trim()) {
      return "First name is required.";
    }
    if (name === "lastName" && !value.trim()) {
      return "Last name is required.";
    }
    if (name === "phone") {
      if (!value.trim()) {
        return "Phone number is required.";
      }
      const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;
      if (!phoneRegex.test(value.trim())) {
        return "Please enter a valid phone number (at least 7 digits).";
      }
    }
    if (name === "nextOfKinPhone" && value.trim()) {
      const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;
      if (!phoneRegex.test(value.trim())) {
        return "Please enter a valid phone number.";
      }
    }
    return null;
  }

  function handleBlur(k: keyof typeof form) {
    setTouched((prev) => ({ ...prev, [k]: true }));
    const error = validateField(k, form[k]);
    if (error) {
      setErrors((prev) => ({ ...prev, [k]: error }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  }

  // Returns true if the fields on the current step are valid
  function isStepValid(stepNum: number): boolean {
    if (stepNum === 1) {
      return (
        !validateField("firstName", form.firstName) && !validateField("lastName", form.lastName)
      );
    }
    if (stepNum === 2) {
      return !validateField("phone", form.phone);
    }
    if (stepNum === 4) {
      return !validateField("nextOfKinPhone", form.nextOfKinPhone);
    }
    return true;
  }

  function handleNext() {
    const newErrors: Record<string, string> = {};
    let hasError = false;

    if (step === 1) {
      const errFirst = validateField("firstName", form.firstName);
      const errLast = validateField("lastName", form.lastName);
      if (errFirst) {
        newErrors.firstName = errFirst;
        hasError = true;
      }
      if (errLast) {
        newErrors.lastName = errLast;
        hasError = true;
      }
      setTouched((prev) => ({ ...prev, firstName: true, lastName: true }));
    } else if (step === 2) {
      const errPhone = validateField("phone", form.phone);
      if (errPhone) {
        newErrors.phone = errPhone;
        hasError = true;
      }
      setTouched((prev) => ({ ...prev, phone: true }));
    } else if (step === 4) {
      const errKinPhone = validateField("nextOfKinPhone", form.nextOfKinPhone);
      if (errKinPhone) {
        newErrors.nextOfKinPhone = errKinPhone;
        hasError = true;
      }
      setTouched((prev) => ({ ...prev, nextOfKinPhone: true }));
    }

    if (hasError) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    setStep((s) => Math.min(s + 1, 5));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  const createPatientMutation = useCreatePatient();

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    // Final check for errors
    if (!isStepValid(1) || !isStepValid(2) || !isStepValid(4)) {
      setStep(1); // send back to start if invalid
      return;
    }

    try {
      const p = await createPatientMutation.mutateAsync(form);
      navigate({ to: "/patients/$id/card", params: { id: p.id } });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to register patient.";
      setErrors((prev) => ({ ...prev, form: errMsg }));
      setStep(5); // Stay on review step to show form-level error
    }
  }

  const stepsInfo = [
    { num: 1, label: "Personal", icon: User },
    { num: 2, label: "Contact", icon: Phone },
    { num: 3, label: "Medical", icon: Activity },
    { num: 4, label: "Emergency", icon: Heart },
    { num: 5, label: "Review", icon: ClipboardCheck },
  ];

  const progressVal = ((step - 1) / 4) * 100;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Patient Intake</p>
          <h1 className="font-serif text-4xl text-primary mt-1">Register new patient</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete the steps below to generate the patient profile and ID card.
          </p>
        </div>
      </div>

      {/* Progress & Stepper */}
      <div className="card-soft p-5 space-y-4 bg-card/60 backdrop-blur-sm">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full px-2 -z-10">
            <Progress value={progressVal} className="h-1 transition-all duration-300" />
          </div>
          {stepsInfo.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  // Let user navigate back to any completed step or next step if valid
                  if (s.num < step) {
                    setStep(s.num);
                  } else if (s.num > step && isStepValid(step)) {
                    // Check if intermediate steps are valid
                    let valid = true;
                    for (let i = step; i < s.num; i++) {
                      if (!isStepValid(i)) {
                        valid = false;
                        break;
                      }
                    }
                    if (valid) setStep(s.num);
                  }
                }}
                className={`flex flex-col items-center gap-1.5 focus:outline-none transition-all duration-200 ${
                  isActive || isCompleted ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300 ${
                    isActive
                      ? "bg-primary border-primary text-primary-foreground scale-110 shadow-md ring-4 ring-primary/10"
                      : isCompleted
                        ? "bg-accent border-accent text-accent-foreground"
                        : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span
                  className={`text-[11px] font-medium hidden sm:inline transition-colors duration-200 ${
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Container */}
      <form
        onSubmit={onSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            if (step < 5) {
              handleNext();
            }
          }
        }}
        className="card-soft p-6 space-y-6 min-h-[350px] flex flex-col justify-between"
      >
        {/* Step Content */}
        <div className="space-y-6 animate-fade-in">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
                1. Personal Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="First Name *"
                  error={touched.firstName ? errors.firstName : undefined}
                >
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    onBlur={() => handleBlur("firstName")}
                    placeholder="Enter first name"
                    autoFocus
                    required
                  />
                </Field>
                <Field label="Last Name *" error={touched.lastName ? errors.lastName : undefined}>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    onBlur={() => handleBlur("lastName")}
                    placeholder="Enter last name"
                    required
                  />
                </Field>
                <Field label="Date of Birth" error={errors.dob}>
                  <Input
                    type="date"
                    id="dob"
                    value={form.dob}
                    onChange={(e) => set("dob", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </Field>
                <Field label="Gender">
                  <Select
                    value={form.gender}
                    onChange={(v) => set("gender", v)}
                    options={["", "Female", "Male", "Other"]}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
                2. Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Phone Number *" error={touched.phone ? errors.phone : undefined}>
                  <Input
                    type="tel"
                    id="phone"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    onBlur={() => handleBlur("phone")}
                    placeholder="e.g., 08012345678"
                    inputMode="tel"
                    autoComplete="tel"
                    autoFocus
                    required
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Home Address" error={errors.address}>
                    <textarea
                      id="address"
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="Enter residential address"
                      className="w-full min-h-[80px] rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
                3. Medical Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Blood Group">
                  <Select
                    value={form.bloodType}
                    onChange={(v) => set("bloodType", v)}
                    options={BLOOD}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Medical Notes & Allergies" error={errors.notes}>
                    <textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      placeholder="Enter allergies, chronic conditions, or general medical notes..."
                      className="w-full min-h-[100px] rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
                4. Emergency Contact (Next of Kin)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Next of Kin Name" error={errors.nextOfKin}>
                  <Input
                    id="nextOfKin"
                    value={form.nextOfKin}
                    onChange={(e) => set("nextOfKin", e.target.value)}
                    placeholder="Enter next of kin full name"
                    autoFocus
                  />
                </Field>
                <Field
                  label="Next of Kin Phone"
                  error={touched.nextOfKinPhone ? errors.nextOfKinPhone : undefined}
                >
                  <Input
                    type="tel"
                    id="nextOfKinPhone"
                    value={form.nextOfKinPhone}
                    onChange={(e) => set("nextOfKinPhone", e.target.value)}
                    onBlur={() => handleBlur("nextOfKinPhone")}
                    placeholder="e.g., 08098765432"
                    inputMode="tel"
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
                5. Review & Preview Card
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Data Review List */}
                <div className="space-y-4 bg-secondary/20 p-4 rounded-xl text-sm border border-border/40">
                  <h4 className="font-semibold text-primary">Summary Information</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <ReviewField label="Full Name" value={`${form.firstName} ${form.lastName}`} />
                    <ReviewField label="Date of Birth" value={form.dob || "—"} />
                    <ReviewField label="Gender" value={form.gender || "—"} />
                    <ReviewField label="Phone" value={form.phone} />
                    <ReviewField label="Blood Group" value={form.bloodType} />
                    <ReviewField
                      label="Address"
                      value={form.address || "—"}
                      className="col-span-2"
                    />
                    <ReviewField label="Next of Kin" value={form.nextOfKin || "—"} />
                    <ReviewField label="NoK Phone" value={form.nextOfKinPhone || "—"} />
                    <ReviewField
                      label="Medical Notes"
                      value={form.notes || "—"}
                      className="col-span-2"
                    />
                  </div>
                </div>

                {/* Live Card Preview */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Live ID Card Preview
                  </span>

                  <div className="w-[360px] max-w-full shrink-0 overflow-hidden rounded-2xl shadow-lg border border-border/60 bg-card text-foreground">
                    {/* Front */}
                    <div className="relative bg-primary text-primary-foreground p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground font-serif text-base">
                            M
                          </span>
                          <div>
                            <div className="font-serif text-base leading-none">MedBay</div>
                            <div className="text-[8px] uppercase tracking-widest text-primary-foreground/60 mt-0.5">
                              Patient card
                            </div>
                          </div>
                        </div>
                        <span className="rounded-md bg-accent/30 px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold">
                          {form.bloodType || "—"}
                        </span>
                      </div>

                      <div className="mt-6 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-widest text-primary-foreground/60">
                            Patient
                          </div>
                          <div className="font-serif text-xl leading-tight truncate font-semibold mt-0.5">
                            {form.firstName || "First"} {form.lastName || "Last"}
                          </div>
                          <div className="mt-1.5 font-mono text-xs text-primary-foreground/80">
                            {mockId}
                          </div>
                        </div>
                        <div className="rounded-md bg-white p-1 shrink-0 flex items-center justify-center">
                          <QrCode className="h-12 w-12 text-primary" />
                        </div>
                      </div>

                      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/25 blur-xl" />
                    </div>

                    {/* Back */}
                    <div className="p-4 text-xs space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-medium truncate max-w-[180px]">
                          {form.phone || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date of birth</span>
                        <span className="font-medium">{form.dob || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Next of Kin</span>
                        <span className="font-medium truncate max-w-[180px]">
                          {form.nextOfKin || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NoK Phone</span>
                        <span className="font-medium">{form.nextOfKinPhone || "—"}</span>
                      </div>
                      <div className="pt-2 border-t border-border text-[9px] uppercase tracking-widest text-muted-foreground text-center">
                        If found, return to MedBay reception
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Controls */}
        <div className="flex items-center justify-between pt-4 mt-6 border-t border-border">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate({ to: "/patients" })}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={createPatientMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-95 transition-opacity cursor-pointer shadow-md disabled:opacity-50"
            >
              {createPatientMutation.isPending ? "Registering..." : "Register & Generate Card"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
        {label}
      </label>
      {children}
      {error && (
        <span className="text-[11px] text-destructive flex items-center gap-1 mt-0.5">
          <AlertCircle className="h-3 w-3" />
          {error}
        </span>
      )}
    </div>
  );
}

function ReviewField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="text-[10px] uppercase text-muted-foreground block tracking-wider">
        {label}
      </span>
      <span className="font-medium text-foreground truncate block mt-0.5">{value}</span>
    </div>
  );
}

function Input({
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  autoFocus,
  id,
  inputMode,
  autoComplete,
  required,
  max,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  required?: boolean;
  max?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onBlur={onBlur}
      autoFocus={autoFocus}
      inputMode={inputMode}
      autoComplete={autoComplete}
      required={required}
      max={max}
      className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1em_1em] bg-[right_0.75rem_center] bg-no-repeat pr-10"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o || "—"}
        </option>
      ))}
    </select>
  );
}
