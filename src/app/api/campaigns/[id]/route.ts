import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { getCampaignWithContacts } from "@/lib/campaigns";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const campaign = await getCampaignWithContacts(id, userId);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load campaign";
    console.error("[campaigns/[id]]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
