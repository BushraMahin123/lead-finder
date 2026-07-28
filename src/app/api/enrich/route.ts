import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { insufficientTokensResponse } from "@/lib/billing/errors";
import {
  calculateEnrichTokenCost,
  TOKEN_RATES,
} from "@/lib/billing/token-rates";
import {
  assertSufficientTokens,
  debitTokens,
  InsufficientTokensError,
} from "@/lib/billing/tokens";
import { updateCampaignContactEnrichments } from "@/lib/campaigns";
import { enrichContactsWithPersistence } from "@/lib/contact-enrichments";
import { updateCachedSearchEnrichments } from "@/lib/search-cache";
import type { EnrichContactResult, EnrichType, LeadPerson, SearchFilters } from "@/types/lead";

export const maxDuration = 120;

function countFreshExtractions(
  results: EnrichContactResult[],
  type: EnrichType,
): number {
  return results.filter((result) => {
    if (result.fromStorage || result.error) return false;
    if (type === "email") return Boolean(result.email);
    return Boolean(result.phone_numbers?.length);
  }).length;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as {
      people?: LeadPerson[];
      filters?: SearchFilters;
      type?: EnrichType;
      campaignId?: string;
    };
    const people = body.people ?? [];
    const type = body.type;
    const campaignId = body.campaignId?.trim();

    if (type !== "email" && type !== "phone") {
      return NextResponse.json(
        { error: "Choose whether to extract email or phone numbers." },
        { status: 400 },
      );
    }

    if (people.length === 0) {
      return NextResponse.json(
        { error: "Select at least one contact to extract." },
        { status: 400 },
      );
    }

    if (people.length > 25) {
      return NextResponse.json(
        { error: "You can extract up to 25 contacts at a time." },
        { status: 400 },
      );
    }

    const maxDebit = people.length * TOKEN_RATES[type];
    await assertSufficientTokens(userId, maxDebit);

    const results = await enrichContactsWithPersistence(people, type);
    const fromStorage = results.filter((result) => result.fromStorage).length;
    const freshCount = countFreshExtractions(results, type);
    const failed = results.filter((result) => result.error).length;
    const tokenDebit = calculateEnrichTokenCost(type, freshCount);

    let balance = await assertSufficientTokens(userId, tokenDebit);
    if (tokenDebit > 0) {
      balance = await debitTokens({
        userId,
        amount: tokenDebit,
        type: type === "email" ? "enrich_email" : "enrich_phone",
        description: `${type} enrichment (${freshCount} contacts)`,
        metadata: {
          freshCount,
          selectedCount: people.length,
        },
      });
    }

    let cacheUpdated = false;
    if (body.filters) {
      cacheUpdated = await updateCachedSearchEnrichments(body.filters, results);
    }

    let campaignUpdated = false;
    if (campaignId) {
      campaignUpdated = await updateCampaignContactEnrichments(
        campaignId,
        userId,
        results,
      );
    }

    return NextResponse.json({
      results,
      fromStorage,
      cacheUpdated,
      campaignUpdated,
      tokensDebited: tokenDebit,
      tokenBalance: balance,
      failedCount: failed,
    });
  } catch (error) {
    if (error instanceof InsufficientTokensError) {
      return insufficientTokensResponse(error);
    }

    const message =
      error instanceof Error ? error.message : "Extraction request failed";
    console.error("[enrich]", message);
    const status = message.includes("not configured") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
