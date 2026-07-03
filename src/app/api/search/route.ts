import { NextRequest, NextResponse } from "next/server";
import { searchPeople } from "@/lib/ai-ark";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { insufficientTokensResponse } from "@/lib/billing/errors";
import { TOKEN_RATES } from "@/lib/billing/token-rates";
import {
  assertSufficientTokens,
  debitTokens,
  InsufficientTokensError,
} from "@/lib/billing/tokens";
import { mergeEnrichmentsIntoPeople } from "@/lib/contact-enrichments";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import { getCachedSearch, setCachedSearch } from "@/lib/search-cache";
import type { LeadPerson, SearchFilters } from "@/types/lead";

export const maxDuration = 120;

async function withSavedContacts<T extends { people: LeadPerson[] }>(
  response: T,
): Promise<T> {
  return {
    ...response,
    people: await mergeEnrichmentsIntoPeople(response.people),
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as SearchFilters;

    const cached = await getCachedSearch(body);
    if (cached) {
      const response = await withSavedContacts({
        ...cached,
        cached: true,
      });
      return NextResponse.json({
        ...response,
        tokensDebited: 0,
      });
    }

    const perPage = body.perPage ?? SEARCH_RESULTS_PER_PAGE;
    const estimatedDebit = perPage * TOKEN_RATES.lead;
    await assertSufficientTokens(userId, estimatedDebit);

    const { people, totalEntries } = await searchPeople(body);

    const tokenDebit = people.length * TOKEN_RATES.lead;
    let balance = await assertSufficientTokens(userId, tokenDebit);

    if (tokenDebit > 0) {
      balance = await debitTokens({
        userId,
        amount: tokenDebit,
        type: "search_debit",
        description: `Lead search (${people.length} profiles)`,
        metadata: {
          page: body.page ?? 1,
          perPage,
          profileCount: people.length,
        },
      });
    }

    const response = await setCachedSearch(body, {
      people,
      totalEntries,
      page: body.page ?? 1,
      perPage,
    });

    const payload = await withSavedContacts(response);

    return NextResponse.json({
      ...payload,
      tokensDebited: tokenDebit,
      tokenBalance: balance,
    });
  } catch (error) {
    if (error instanceof InsufficientTokensError) {
      return insufficientTokensResponse(error);
    }

    const message =
      error instanceof Error ? error.message : "Search request failed";
    console.error("[search]", message);
    const status = message.includes("not configured") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
