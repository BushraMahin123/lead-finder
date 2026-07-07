import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { adminCompPlanAndTokens } from "@/lib/admin-billing";
import type { PlanId } from "@/lib/billing/plans";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const PLAN_IDS = new Set<PlanId>([
  "free",
  "starter",
  "pro",
  "growth",
  "agency",
]);

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await context.params;

  let body: {
    planId?: string;
    tokenAmount?: number;
    syncStripe?: boolean;
    note?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const planId = body.planId as PlanId | undefined;
  if (!planId || !PLAN_IDS.has(planId)) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
  }

  const tokenAmount =
    body.tokenAmount === undefined ? undefined : Number(body.tokenAmount);
  if (
    tokenAmount !== undefined &&
    (!Number.isFinite(tokenAmount) || tokenAmount < 0)
  ) {
    return NextResponse.json({ error: "Invalid tokenAmount" }, { status: 400 });
  }

  try {
    const result = await adminCompPlanAndTokens({
      userId,
      adminUserId: auth.userId,
      planId,
      tokenAmount,
      syncStripe: body.syncStripe,
      note: body.note?.trim() || undefined,
    });

    return NextResponse.json({
      message: `Comped ${result.planId} with ${result.tokensGranted.toLocaleString()} tokens`,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to comp user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
