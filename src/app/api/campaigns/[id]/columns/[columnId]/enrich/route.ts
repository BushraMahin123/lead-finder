import { NextRequest, NextResponse } from "next/server";
import { enrichPersonWithAiColumn } from "@/lib/ai-column-enrich";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { insufficientTokensResponse } from "@/lib/billing/errors";
import { TOKEN_RATES } from "@/lib/billing/token-rates";
import {
  assertSufficientTokens,
  debitTokens,
  InsufficientTokensError,
} from "@/lib/billing/tokens";
import {
  getCampaignColumn,
  upsertColumnValues,
} from "@/lib/campaign-columns";
import { getCampaignWithContacts } from "@/lib/campaigns";
import type { LeadPerson } from "@/types/lead";

export const maxDuration = 120;

const MAX_ROWS_PER_REQUEST = 15;

interface RouteContext {
  params: Promise<{ id: string; columnId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id: campaignId, columnId } = await context.params;
    const body = (await request.json()) as { personIds?: string[] };
    const personIds = [...new Set(body.personIds ?? [])].slice(
      0,
      MAX_ROWS_PER_REQUEST,
    );

    if (personIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one contact to enrich." },
        { status: 400 },
      );
    }

    const [column, campaign] = await Promise.all([
      getCampaignColumn(campaignId, columnId, userId),
      getCampaignWithContacts(campaignId, userId),
    ]);

    if (!column || !campaign) {
      return NextResponse.json({ error: "Table or column not found." }, { status: 404 });
    }

    const peopleById = new Map(
      campaign.contacts.map((person) => [person.id, person]),
    );
    const targets = personIds
      .map((personId) => peopleById.get(personId))
      .filter((person): person is LeadPerson => Boolean(person));

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "No matching contacts found in this table." },
        { status: 400 },
      );
    }

    await assertSufficientTokens(
      userId,
      targets.length * TOKEN_RATES.aiColumn,
    );

    await upsertColumnValues(
      campaignId,
      columnId,
      column.promptHash,
      targets.map((person) => ({
        personId: person.id,
        value: null,
        status: "running",
      })),
    );

    const results: Array<{
      personId: string;
      value: string | null;
      status: "done" | "error";
      error?: string;
      fromCache?: boolean;
    }> = [];

    let freshCount = 0;

    for (const person of targets) {
      try {
        const value = await enrichPersonWithAiColumn(person, column.prompt);
        freshCount += 1;
        results.push({
          personId: person.id,
          value,
          status: "done",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "AI enrichment failed";
        results.push({
          personId: person.id,
          value: null,
          status: "error",
          error: message,
        });
      }
    }

    await upsertColumnValues(
      campaignId,
      columnId,
      column.promptHash,
      results.map((result) => ({
        personId: result.personId,
        value: result.value,
        status: result.status,
        error: result.error ?? null,
      })),
    );

    let tokenBalance: number | undefined;
    if (freshCount > 0) {
      const debitAmount = freshCount * TOKEN_RATES.aiColumn;
      tokenBalance = await debitTokens({
        userId,
        amount: debitAmount,
        type: "ai_column_debit",
        description: `AI column "${column.name}" (${freshCount} cells)`,
        metadata: {
          campaignId,
          columnId,
          cellCount: freshCount,
        },
      });
    }

    return NextResponse.json({
      results,
      tokensDebited: freshCount * TOKEN_RATES.aiColumn,
      tokenBalance,
    });
  } catch (error) {
    if (error instanceof InsufficientTokensError) {
      return insufficientTokensResponse(error);
    }

    const message =
      error instanceof Error ? error.message : "AI column enrichment failed";
    console.error("[columns/enrich]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
