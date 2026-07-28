import { NextRequest, NextResponse } from "next/server";
import {
  mergePeopleIntoExcludeLists,
  type PeopleExcludeListState,
} from "@/lib/ai-ark";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { insufficientTokensResponse } from "@/lib/billing/errors";
import { calculateSaveTokenCost } from "@/lib/billing/token-rates";
import {
  assertSufficientTokens,
  debitTokens,
  InsufficientTokensError,
} from "@/lib/billing/tokens";
import {
  createCampaign,
  getCampaignForUser,
  insertCampaignContacts,
  listCampaignPersonIds,
  updateCampaignContactCount,
} from "@/lib/campaigns";
import { fetchContactsUpToServer } from "@/lib/fetch-contacts-server";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import { SAVE_CONTACTS_PER_REQUEST } from "@/lib/save-contacts-config";
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
  /** Reusable AI Ark exclude lists from prior chunks in this save session. */
  excludeLists?: PeopleExcludeListState[];
}

function normalizeExcludeLists(
  value: unknown,
): PeopleExcludeListState[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const id = String((item as { id?: unknown }).id ?? "").trim();
      const count = Number((item as { count?: unknown }).count ?? 0);
      if (!id || !Number.isFinite(count) || count < 0) return null;
      return { id, count: Math.floor(count) };
    })
    .filter((item): item is PeopleExcludeListState => Boolean(item));
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as SaveCampaignBody;

    const requestedCount = Math.min(
      Math.floor(Number(body.contactCount)),
      SAVE_CONTACTS_PER_REQUEST,
    );
    if (!body.filters || !Number.isFinite(requestedCount) || requestedCount < 1) {
      return NextResponse.json(
        { error: "Missing search filters or contact count" },
        { status: 400 },
      );
    }

    const maxAvailable = Math.max(
      1,
      Math.floor(Number(body.totalEntries) || requestedCount),
    );
    const remainingRequested = Math.min(requestedCount, maxAvailable);
    const chunkCount = Math.min(remainingRequested, SAVE_CONTACTS_PER_REQUEST);

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

    await assertSufficientTokens(
      userId,
      calculateSaveTokenCost(chunkCount, body.enrichEmail, body.enrichPhone)
        .total,
    );

    let excludeLists = normalizeExcludeLists(body.excludeLists);

    // First chunk / resume without lists: build once from contacts already in the table.
    if (excludeLists.length === 0 && campaign.contactCount > 0) {
      const existingIds = await listCampaignPersonIds(campaign.id);
      excludeLists = await mergePeopleIntoExcludeLists(existingIds, []);
    }

    const { people } = await fetchContactsUpToServer(
      {
        ...body.filters,
        page: 1,
        perPage: SEARCH_RESULTS_PER_PAGE,
      },
      chunkCount,
      {
        excludePeopleListIds: excludeLists.map((list) => list.id),
      },
    );

    if (people.length === 0) {
      return NextResponse.json({
        campaign: {
          ...campaign,
          contactCount: campaign.contactCount,
        },
        savedCount: 0,
        hasMore: false,
        excludeLists,
        tokensDebited: 0,
        tokenBalance: null,
      });
    }

    const tokenCost = calculateSaveTokenCost(
      people.length,
      body.enrichEmail,
      body.enrichPhone,
    );
    await assertSufficientTokens(userId, tokenCost.total);

    await insertCampaignContacts(campaign.id, people, campaign.contactCount);
    const contactCount = await updateCampaignContactCount(campaign.id);

    const nextExcludeLists = await mergePeopleIntoExcludeLists(
      people.map((person) => person.id),
      excludeLists,
    );

    const balance = await debitTokens({
      userId,
      amount: tokenCost.total,
      type: "save_contacts",
      description: `Saved ${people.length} contacts to ${campaign.name}`,
      metadata: {
        campaignId: campaign.id,
        contactCount: people.length,
        requestedCount: remainingRequested,
        enrichEmail: body.enrichEmail,
        enrichPhone: body.enrichPhone,
        breakdown: tokenCost,
      },
      idempotencyKey: `save:${campaign.id}:${contactCount}:${Date.now()}`,
    });

    return NextResponse.json({
      campaign: {
        ...campaign,
        contactCount,
      },
      savedCount: people.length,
      hasMore: people.length >= chunkCount,
      excludeLists: nextExcludeLists,
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
