import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { redirectToPath } from "@/lib/request-url";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    await supabase.auth.signOut({ scope: "local" });
  }

  revalidatePath("/", "layout");

  const acceptsJson = request.headers.get("accept")?.includes("application/json");
  if (acceptsJson) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.redirect(redirectToPath(request, "/"), { status: 302 });
}
