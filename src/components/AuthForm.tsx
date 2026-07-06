"use client";

import Link from "next/link";
import { useActionState } from "react";
import AuthShell from "@/components/AuthShell";
import OAuthButtons from "@/components/OAuthButtons";

type AuthFormProps = {
  action: (
    state: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  message?: string | null;
  next?: string | null;
};

export type AuthFormState = {
  error: string | null;
};

const initialState: AuthFormState = { error: null };

export default function AuthForm({ action, message, next }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to search leads, enrich contacts, and manage your campaigns."
    >
      <div className="space-y-6">
        <OAuthButtons />

        {message && <div className="alert-success">{message}</div>}
        {state.error && <div className="alert-error">{state.error}</div>}

        <form action={formAction} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}

          <div className="space-y-2">
            <label htmlFor="email" className="label">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field"
              placeholder="you@company.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              className="input-field"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary w-full py-2.5"
          >
            {pending ? "Signing in…" : "Sign in with email"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
