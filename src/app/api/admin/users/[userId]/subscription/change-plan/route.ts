import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { adminChangeUserPlan } from "@/lib/admin-billing";
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
    grantMonthlyTokens?: boolean;
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

  try {
    const result = await adminChangeUserPlan({
      userId,
      adminUserId: auth.userId,
      planId,
      grantMonthlyTokens: Boolean(body.grantMonthlyTokens),
      syncStripe: body.syncStripe,
      note: body.note?.trim() || undefined,
    });

    return NextResponse.json({
      message: `Plan updated to ${planId}`,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to change plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
