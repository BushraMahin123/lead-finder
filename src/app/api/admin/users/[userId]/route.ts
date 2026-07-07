import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { getAdminUserDetail } from "@/lib/admin-data";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await context.params;

  try {
    const user = await getAdminUserDetail(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
