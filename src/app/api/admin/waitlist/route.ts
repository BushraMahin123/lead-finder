import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { listAdminWaitlist } from "@/lib/admin-accounts";

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const query = searchParams.get("q")?.trim() || undefined;

  try {
    const result = await listAdminWaitlist({ query, page, perPage: 20 });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load waitlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
