import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/request-url";
import { hasUserProfile } from "@/lib/signup/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = getRequestOrigin(request);
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
