"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SignupFormState } from "@/components/SignupForm";
import { parseSignupProfile, saveUserProfile } from "@/lib/signup/profile";
import { createClient } from "@/lib/supabase/server";

export async function signup(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const parsed = parseSignupProfile(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const { profile } = parsed;
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: profile.email,
    password,
    options: {
      data: {
        first_name: profile.firstName,
        last_name: profile.lastName,
        full_name: `${profile.firstName} ${profile.lastName}`,
        company_name: profile.companyName,
        job_title: profile.jobTitle,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Account could not be created. Please try again." };
  }

  const saved = await saveUserProfile(data.user.id, profile);
  if (!saved.ok) {
    return { error: saved.error };
  }

  revalidatePath("/", "layout");

  if (data.session) {
    redirect("/?view=search");
  }

  redirect(
    "/login?message=" +
      encodeURIComponent(
        "Check your email to confirm your account, then sign in.",
      ),
  );
}
