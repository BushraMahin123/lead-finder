"use client";

import { useActionState } from "react";
import AuthShell from "@/components/AuthShell";
import WorkspaceProfileFields from "@/components/WorkspaceProfileFields";

export type OnboardingFormState = {
  error: string | null;
};

type OnboardingFormProps = {
  action: (
    state: OnboardingFormState,
    formData: FormData,
  ) => Promise<OnboardingFormState>;
  email: string;
  firstName: string;
  lastName: string;
};

const initialState: OnboardingFormState = { error: null };

export default function OnboardingForm({
  action,
  email,
  firstName,
  lastName,
}: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <AuthShell
      title="Complete your workspace"
      subtitle="You're signed in with Google. Tell us about your company so we can tailor Lead Finder for you."
      wide
    >
      <form action={formAction} className="space-y-5">
        {state.error && <div className="alert-error">{state.error}</div>}

        <WorkspaceProfileFields
          firstName={firstName}
          lastName={lastName}
          email={email}
          readOnlyEmail
        />

        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary w-full py-3"
        >
          {pending ? "Saving workspace…" : "Continue to Lead Finder"}
        </button>
      </form>
    </AuthShell>
  );
}
