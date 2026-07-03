import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClaims, unauthorizedResponse } from "@/lib/auth";
import { parseLeadQueryWithGemini } from "@/lib/gemini-search";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const claims = await getAuthenticatedClaims();
    if (!claims) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Enter a description of the leads you want to find." },
        { status: 400 },
      );
    }

    const filters = await parseLeadQueryWithGemini(query);

    return NextResponse.json({ filters });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI search parsing failed";
    console.error("[ai-search]", message);
    const status = message.includes("not configured") ? 500 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
