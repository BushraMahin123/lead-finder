import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { updateCampaignContactMeta } from "@/lib/campaigns";
import type { ContactStatus, RowColor } from "@/types/campaign";

interface RouteContext {
  params: Promise<{ id: string; personId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id, personId } = await context.params;
    const body = (await request.json()) as {
      status?: ContactStatus;
      notes?: string;
      rowColor?: RowColor | null;
      isDone?: boolean;
    };

    const meta = await updateCampaignContactMeta({
      campaignId: id,
      personId,
      userId,
      status: body.status,
      notes: body.notes,
      rowColor: body.rowColor,
      isDone: body.isDone,
    });

    return NextResponse.json({ meta });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update contact";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
