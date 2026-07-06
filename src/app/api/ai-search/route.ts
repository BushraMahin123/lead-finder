import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { insufficientTokensResponse } from "@/lib/billing/errors";
import { TOKEN_RATES } from "@/lib/billing/token-rates";
import {
  assertSufficientTokens,
  debitTokens,
  InsufficientTokensError,
} from "@/lib/billing/tokens";
import { AiParseRateLimitError } from "@/lib/ai-parse-rate-limit";
import { parseLeadQueryWithGemini } from "@/lib/gemini-search";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
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

    const result = await parseLeadQueryWithGemini(query, { userId });

    let tokenBalance: number | undefined;
    const tokensDebited = result.tokensDebited ?? 0;

    if (tokensDebited > 0) {
      await assertSufficientTokens(userId, tokensDebited);
      tokenBalance = await debitTokens({
        userId,
        amount: tokensDebited,
        type: "ai_parse_debit",
        description: "AI search filter parsing",
        metadata: {
          source: result.source,
          tokenRate: TOKEN_RATES.aiParse,
        },
      });
    }

    return NextResponse.json({
      filters: result.filters,
      warning: result.warning ?? null,
      source: result.source,
      cached: Boolean(result.cached),
      tokensDebited,
      tokenBalance,
    });
  } catch (error) {
    if (error instanceof AiParseRateLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "AI_RATE_LIMIT",
        },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }

    if (error instanceof InsufficientTokensError) {
      return insufficientTokensResponse(error);
    }

    const message =
      error instanceof Error ? error.message : "AI search parsing failed";
    console.error("[ai-search]", message);
    const status = message.includes("not configured") ? 500 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
