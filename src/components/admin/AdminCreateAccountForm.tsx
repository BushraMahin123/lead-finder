"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, fetchJson } from "@/lib/fetch-json";

type CreateAccountFormProps = {
  initialEmail?: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialCompanyName?: string;
  initialJobTitle?: string;
  submitLabel?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  /** When set, uses the waitlist invite endpoint instead of generic create. */
  waitlistSignupId?: string;
};

type CreateResult = {
  userId?: string;
  email?: string;
  temporaryPassword?: string;
  emailSent?: boolean;
  emailError?: string | null;
  message?: string;
  error?: string;
};

export default function AdminCreateAccountForm({
  initialEmail = "",
  initialFirstName = "",
  initialLastName = "",
  initialCompanyName = "",
  initialJobTitle = "",
  submitLabel = "Create account & email credentials",
  onSuccess,
  onCancel,
  waitlistSignupId,
}: CreateAccountFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [password, setPassword] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const url = waitlistSignupId
        ? `/api/admin/waitlist/${waitlistSignupId}`
        : "/api/admin/users/create";

      const body = waitlistSignupId
        ? {
            password: password.trim() || undefined,
            sendEmail,
          }
        : {
            email: email.trim(),
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            companyName: companyName.trim() || undefined,
            jobTitle: jobTitle.trim() || undefined,
            password: password.trim() || undefined,
            sendEmail,
          };

      const { response, data } = await fetchJson<CreateResult>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new ApiError(data.error || "Failed to create account", response.status);
      }

      setResult(data);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setBusy(false);
    }
  }

  if (result?.userId) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
        <p className="font-medium text-emerald-900">
          {result.message ?? "Account created."}
        </p>
        {result.emailError && (
          <p className="text-amber-800">{result.emailError}</p>
        )}
        <div className="rounded-lg bg-white/80 p-3 font-mono text-xs text-slate-800">
          <div>
            <span className="text-slate-500">Email:</span> {result.email}
          </div>
          <div className="mt-1">
            <span className="text-slate-500">Temporary password:</span>{" "}
            {result.temporaryPassword}
          </div>
        </div>
        <p className="text-xs text-slate-600">
          {result.emailSent
            ? "Credentials were emailed. Copy above if you also want to share them manually."
            : "Copy these credentials and share them securely — email was not sent."}
        </p>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!waitlistSignupId && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-700">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-field w-full"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">First name</span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="input-field w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Last name</span>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="input-field w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Company</span>
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="input-field w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Job title</span>
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              className="input-field w-full"
            />
          </label>
        </div>
      )}

      {waitlistSignupId && (
        <p className="text-sm text-slate-600">
          Creates an account for <span className="font-medium text-slate-900">{email}</span>{" "}
          using their waitlist details, then emails them a temporary password.
        </p>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">
          Temporary password{" "}
          <span className="font-normal text-slate-500">(optional — auto-generated if blank)</span>
        </span>
        <input
          type="text"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input-field w-full font-mono"
          minLength={6}
          autoComplete="new-password"
          placeholder="Leave blank to generate"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={sendEmail}
          onChange={(event) => setSendEmail(event.target.checked)}
          className="rounded border-slate-300"
        />
        Email credentials to the user
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Creating…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
