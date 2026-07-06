import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import {
  deleteCampaignColumn,
  updateCampaignColumn,
} from "@/lib/campaign-columns";

interface RouteContext {
  params: Promise<{ id: string; columnId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id, columnId } = await context.params;
    const body = (await request.json()) as { name?: string; prompt?: string };

    const column = await updateCampaignColumn({
      campaignId: id,
      columnId,
      userId,
      name: body.name,
      prompt: body.prompt,
    });

    return NextResponse.json({ column });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update column";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id, columnId } = await context.params;
    await deleteCampaignColumn(id, columnId, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete column";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
