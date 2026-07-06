import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import {
  createCampaignColumn,
  listCampaignColumns,
} from "@/lib/campaign-columns";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await context.params;
    const columns = await listCampaignColumns(id, userId);
    return NextResponse.json({ columns });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load columns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await context.params;
    const body = (await request.json()) as { name?: string; prompt?: string };
    const name = body.name?.trim();
    const prompt = body.prompt?.trim();

    if (!name) {
      return NextResponse.json({ error: "Column name is required." }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: "AI prompt is required." }, { status: 400 });
    }

    const column = await createCampaignColumn({
      campaignId: id,
      userId,
      name,
      prompt,
    });

    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create column";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
