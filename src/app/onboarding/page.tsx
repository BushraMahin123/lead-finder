import { redirect } from "next/navigation";
import OnboardingForm from "@/components/OnboardingForm";
import {
  getOAuthNameDefaults,
  hasUserProfile,
} from "@/lib/signup/profile";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  if (await hasUserProfile(user.id)) {
    redirect("/?view=search");
  }

  const { firstName, lastName } = getOAuthNameDefaults(user.user_metadata);

  return (
    <OnboardingForm
      action={completeOnboarding}
      email={user.email ?? ""}
      firstName={firstName}
      lastName={lastName}
    />
  );
}
