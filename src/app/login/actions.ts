"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthFormState } from "@/components/AuthForm";
import { hasUserProfile } from "@/lib/signup/profile";
import { createClient } from "@/lib/supabase/server";

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");

  const userId = data.user?.id;
  if (userId && !(await hasUserProfile(userId))) {
    redirect("/onboarding");
  }

  const next = String(formData.get("next") ?? "").trim();
  const destination =
    next.startsWith("/") && !next.startsWith("//") ? next : "/?view=search";

  redirect(destination);
}
