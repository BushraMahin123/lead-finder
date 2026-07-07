import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { changeUserPlan } from "@/lib/billing/change-plan";
import { getPlanById, type PlanId } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { syncStripeSubscriptionForUser } from "@/lib/billing/sync-subscription";
import { getUserBillingSnapshot } from "@/lib/billing/tokens";

const PLAN_IDS = new Set<PlanId>([
  "free",
  "starter",
  "pro",
  "growth",
  "agency",
]);

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured yet." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { planId?: string };
    const planId = body.planId as PlanId | undefined;

    if (!planId || !PLAN_IDS.has(planId)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const snapshot = await getUserBillingSnapshot(userId);
    if (snapshot.planId === planId) {
      return NextResponse.json({
        message: `You are already on the ${plan.name} plan.`,
        planId,
      });
    }

    let hasSubscription = Boolean(snapshot.stripeSubscriptionId);
    if (!hasSubscription) {
      hasSubscription = await syncStripeSubscriptionForUser(userId);
    }

    if (planId !== "free" && !hasSubscription) {
      return NextResponse.json(
        {
          error:
            "No active Stripe subscription is linked to your account. Use Subscribe/Upgrade to open Checkout, or check that Stripe webhooks are configured.",
          code: "no_stripe_subscription",
        },
        { status: 400 },
      );
    }

    const result = await changeUserPlan(userId, planId);

    return NextResponse.json({
      message: `Plan updated to ${plan.name}`,
      planId: result.planId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to change plan";
    console.error("[billing/change-plan]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
