import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { listCampaignsForUser } from "@/lib/campaigns";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const campaigns = await listCampaignsForUser(userId);
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load campaigns";
    console.error("[campaigns]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
