import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { getPlanById } from "@/lib/billing/plans";
import { getUserBillingSnapshot } from "@/lib/billing/tokens";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    let snapshot = await getUserBillingSnapshot(userId);
    if (!snapshot.stripeSubscriptionId && snapshot.stripeCustomerId) {
      const { syncStripeSubscriptionForUser } = await import(
        "@/lib/billing/sync-subscription"
      );
      await syncStripeSubscriptionForUser(userId);
      snapshot = await getUserBillingSnapshot(userId);
    }
    const plan = getPlanById(snapshot.planId);

    return NextResponse.json({
      balance: snapshot.balance,
      planId: snapshot.planId,
      planName: plan?.name ?? snapshot.planId,
      freeTokensGranted: snapshot.freeTokensGranted,
      subscriptionStatus: snapshot.subscriptionStatus,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      hasStripeCustomer: Boolean(snapshot.stripeCustomerId),
      hasStripeSubscription: Boolean(snapshot.stripeSubscriptionId),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load billing balance";
    console.error("[billing/balance]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
