import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { getAdminStats, listRecentLedger } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const [stats, recentLedger] = await Promise.all([
      getAdminStats(),
      listRecentLedger(20),
    ]);

    return NextResponse.json({ stats, recentLedger });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load admin stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
