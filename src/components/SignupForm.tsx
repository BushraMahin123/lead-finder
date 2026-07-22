"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import AuthShell from "@/components/AuthShell";
import OAuthButtons from "@/components/OAuthButtons";
import WorkspaceProfileFields from "@/components/WorkspaceProfileFields";

export type SignupFormState = {
  error: string | null;
};

type SignupFormProps = {
  action: (
    state: SignupFormState,
    formData: FormData,
  ) => Promise<SignupFormState>;
};

const initialState: SignupFormState = { error: null };

type StepOneData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export default function SignupForm({ action }: SignupFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [step, setStep] = useState<1 | 2>(1);
  const [stepOne, setStepOne] = useState<StepOneData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  function handleStepOne(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("first_name") ?? "").trim();
    const lastName = String(form.get("last_name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!firstName || !lastName || !email || password.length < 6) return;

    setStepOne({ firstName, lastName, email, password });
    setStep(2);
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        step === 1
          ? "Start with your account details — workspace setup takes under a minute."
          : "Tell us about your company so we can tailor your experience."
      }
      wide
    >
      <div className="mb-6 flex items-center gap-3">
        <StepIndicator active={step >= 1} label="Account" />
        <div className={`h-px flex-1 ${step >= 2 ? "bg-indigo-300" : "bg-slate-200"}`} />
        <StepIndicator active={step >= 2} label="Workspace" />
      </div>

      <div className="space-y-6">
        {state.error && <div className="alert-error">{state.error}</div>}

        {step === 1 ? (
          <>
            <OAuthButtons next="/onboarding" />
            <form onSubmit={handleStepOne} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" id="first_name" name="first_name" defaultValue={stepOne.firstName} placeholder="Jane" autoComplete="given-name" required />
                <Field label="Last name" id="last_name" name="last_name" defaultValue={stepOne.lastName} placeholder="Smith" autoComplete="family-name" required />
              </div>
              <Field label="Work email" id="email" name="email" type="email" defaultValue={stepOne.email} placeholder="you@company.com" autoComplete="email" required />
              <Field label="Password" id="password" name="password" type="password" defaultValue={stepOne.password} placeholder="At least 6 characters" autoComplete="new-password" minLength={6} required />
              <button type="submit" className="btn btn-primary w-full py-3">
                Continue to workspace details
              </button>
            </form>
          </>
        ) : (
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="first_name" value={stepOne.firstName} />
            <input type="hidden" name="last_name" value={stepOne.lastName} />
            <input type="hidden" name="email" value={stepOne.email} />
            <input type="hidden" name="password" value={stepOne.password} />

            <WorkspaceProfileFields includeIdentityFields={false} />

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary flex-1 py-3">
                Back
              </button>
              <button type="submit" disabled={pending} className="btn btn-primary flex-[2] py-3">
                {pending ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function StepIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>
        {label === "Account" ? "1" : "2"}
      </span>
      <span className={`text-sm font-medium ${active ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
    </div>
  );
}

function Field({
  label,
  id,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
  minLength,
  defaultValue,
}: {
  label: string;
  id: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      {/* <label htmlFor={id} className="label">{label}</label> */}
      <label
        htmlFor={id}
        className="label flex items-center gap-1"
      >
        <span>{label}</span>
        {required && (
          <span
            className="ml-1 text-red-500 font-bold"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        className="input-field"
      />
    </div>
  );
}
