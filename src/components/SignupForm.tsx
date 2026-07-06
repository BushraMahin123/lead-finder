"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import AuthShell from "@/components/AuthShell";
import OAuthButtons from "@/components/OAuthButtons";
import {
  COMPANY_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
  USE_CASE_OPTIONS,
} from "@/lib/signup/options";

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
            <OAuthButtons />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name" id="company_name" name="company_name" placeholder="Acme Inc." autoComplete="organization" required />
              <Field label="Job title" id="job_title" name="job_title" placeholder="Head of Sales" autoComplete="organization-title" required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="company_size" className="label">Company size</label>
                <select id="company_size" name="company_size" required defaultValue="" className="input-field">
                  <option value="" disabled>Select size</option>
                  {COMPANY_SIZE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="industry" className="label">Industry</label>
                <select id="industry" name="industry" required defaultValue="" className="input-field">
                  <option value="" disabled>Select industry</option>
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="use_case" className="label">Primary use case</label>
                <select id="use_case" name="use_case" required defaultValue="" className="input-field">
                  <option value="" disabled>How will you use Lead Finder?</option>
                  {USE_CASE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <Field label="Country (optional)" id="country" name="country" placeholder="United States" autoComplete="country-name" />
            </div>

            <Field label="Phone (optional)" id="phone" name="phone" type="tel" placeholder="+1 555 000 0000" autoComplete="tel" />

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm leading-relaxed text-slate-600">
              <input type="checkbox" name="marketing_opt_in" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span>Send me product updates, tips, and occasional offers.</span>
            </label>

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
      <label htmlFor={id} className="label">{label}</label>
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
