import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { hasUserProfile } from "@/lib/signup/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/?view=search";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      revalidatePath("/", "layout");
      const safeNext =
        next.startsWith("/") && !next.startsWith("//") ? next : "/?view=search";

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const destination =
        user && !(await hasUserProfile(user.id)) ? "/onboarding" : safeNext;

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent("Sign in was cancelled or failed. Please try again.")}`,
  );
}
