"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OnboardingFormState } from "@/components/OnboardingForm";
import {
  hasUserProfile,
  parseOnboardingProfile,
  saveUserProfile,
} from "@/lib/signup/profile";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(
  _prevState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
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

  const parsed = parseOnboardingProfile(formData, user.email ?? "");
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const { profile } = parsed;

  await supabase.auth.updateUser({
    data: {
      first_name: profile.firstName,
      last_name: profile.lastName,
      full_name: `${profile.firstName} ${profile.lastName}`,
      company_name: profile.companyName,
      job_title: profile.jobTitle,
    },
  });

  const saved = await saveUserProfile(user.id, profile);
  if (!saved.ok) {
    return { error: saved.error };
  }

  revalidatePath("/", "layout");
  redirect("/?view=search");
}
