import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { listAdminCampaigns } from "@/lib/admin-data";

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(searchParams.get("perPage") ?? "20");

  try {
    const result = await listAdminCampaigns({ page, perPage });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load tables";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
