import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin";
import { getAuthenticatedUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ isSuperAdmin: false }, { status: 401 });
  }

  const allowed = await isSuperAdmin(userId);
  return NextResponse.json({ isSuperAdmin: allowed });
}
