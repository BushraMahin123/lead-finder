import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { insufficientTokensResponse } from "@/lib/billing/errors";
import { calculateSaveTokenCost, TOKEN_RATES } from "@/lib/billing/token-rates";
import {
  assertSufficientTokens,
  debitTokens,
  InsufficientTokensError,
} from "@/lib/billing/tokens";
import {
  createCampaign,
  getCampaignForUser,
  insertCampaignContacts,
  updateCampaignContactCount,
} from "@/lib/campaigns";
import { fetchContactsUpToServer } from "@/lib/fetch-contacts-server";
import { enrichContactsWithPersistence, applyEnrichmentResults } from "@/lib/contact-enrichments";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import type { SearchFilters } from "@/types/lead";

export const maxDuration = 120;

interface SaveCampaignBody {
  campaignId?: string;
  name?: string;
  filters: SearchFilters;
  contactCount: number;
  enrichEmail: boolean;
  enrichPhone: boolean;
  aiQuery?: string | null;
  totalEntries: number;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as SaveCampaignBody;

    if (!body.filters || !body.contactCount) {
      return NextResponse.json(
        { error: "Missing search filters or contact count" },
        { status: 400 },
      );
    }

    const campaignId = body.campaignId?.trim();
    const name = body.name?.trim();

    if (!campaignId && !name) {
      return NextResponse.json(
        { error: "Select a campaign or provide a name for a new table" },
        { status: 400 },
      );
    }

    let campaign =
      campaignId ? await getCampaignForUser(campaignId, userId) : null;

    if (campaignId && !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!campaign) {
      campaign = await createCampaign({
        userId,
        name: name!,
        searchFilters: {
          ...body.filters,
          page: 1,
          perPage: SEARCH_RESULTS_PER_PAGE,
        },
        searchTotal: body.totalEntries,
        aiQuery: body.aiQuery ?? null,
        enrichEmail: body.enrichEmail,
        enrichPhone: body.enrichPhone,
      });
    }

    let { people } = await fetchContactsUpToServer(
      {
        ...body.filters,
        page: 1,
        perPage: SEARCH_RESULTS_PER_PAGE,
      },
      body.contactCount,
    );

    // Perform enrichment if requested and count successful extractions
    let successfulEmailExtractions = 0;
    let successfulPhoneExtractions = 0;
    
    if (body.enrichEmail || body.enrichPhone) {
      const enrichmentResults: any[] = [];
      
      if (body.enrichEmail && body.enrichPhone) {
        const results = await enrichContactsWithPersistence(people, "email");
        successfulEmailExtractions = results.filter(r => r.email && !r.fromStorage).length;
        enrichmentResults.push(...results);
        const phoneResults = await enrichContactsWithPersistence(people, "phone");
        successfulPhoneExtractions = phoneResults.filter(r => r.phone_numbers?.length && !r.fromStorage).length;
        enrichmentResults.push(...phoneResults);
      } else if (body.enrichEmail) {
        const results = await enrichContactsWithPersistence(people, "email");
        successfulEmailExtractions = results.filter(r => r.email && !r.fromStorage).length;
        enrichmentResults.push(...results);
      } else if (body.enrichPhone) {
        const results = await enrichContactsWithPersistence(people, "phone");
        successfulPhoneExtractions = results.filter(r => r.phone_numbers?.length && !r.fromStorage).length;
        enrichmentResults.push(...results);
      }
      
      people = applyEnrichmentResults(people, enrichmentResults);
    }

    // Calculate token cost based on actual successful extractions
    const tokenCost = calculateSaveTokenCost(
      people.length,
      body.enrichEmail,
      body.enrichPhone,
    );
    
    // Override email and phone costs with actual successful extractions
    tokenCost.email = successfulEmailExtractions * TOKEN_RATES.email;
    tokenCost.phone = successfulPhoneExtractions * TOKEN_RATES.phone;
    tokenCost.total = tokenCost.leads + tokenCost.email + tokenCost.phone;
    
    await assertSufficientTokens(userId, tokenCost.total);

    await insertCampaignContacts(campaign.id, people, campaign.contactCount);
    const contactCount = await updateCampaignContactCount(campaign.id);

    const balance = await debitTokens({
      userId,
      amount: tokenCost.total,
      type: "save_contacts",
      description: `Saved ${people.length} contacts to ${campaign.name}`,
      metadata: {
        campaignId: campaign.id,
        contactCount: people.length,
        enrichEmail: body.enrichEmail,
        enrichPhone: body.enrichPhone,
        successfulEmailExtractions,
        successfulPhoneExtractions,
        breakdown: tokenCost,
      },
      idempotencyKey: `save:${campaign.id}:${body.contactCount}:${Date.now()}`,
    });

    return NextResponse.json({
      campaign: {
        ...campaign,
        contactCount,
      },
      savedCount: people.length,
      tokensDebited: tokenCost.total,
      tokenBalance: balance,
    });
  } catch (error) {
    if (error instanceof InsufficientTokensError) {
      return insufficientTokensResponse(error);
    }

    const message =
      error instanceof Error ? error.message : "Failed to save contacts";
    console.error("[campaigns/save]", message);
    const status = message.includes("not configured") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
