import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { getAdminTelnyxBillingSummary } from "@/lib/admin-data";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const summary = await getAdminTelnyxBillingSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Telnyx billing summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
