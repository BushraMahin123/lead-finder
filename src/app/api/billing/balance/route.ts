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
    let cancelAtPeriodEnd = false;
    let currentPeriodEnd = snapshot.currentPeriodEnd;

    if (snapshot.stripeCustomerId) {
      const { syncStripeSubscriptionForUser } = await import(
        "@/lib/billing/sync-subscription"
      );
      const sync = await syncStripeSubscriptionForUser(userId);
      snapshot = await getUserBillingSnapshot(userId);
      cancelAtPeriodEnd = sync.cancelAtPeriodEnd;
      currentPeriodEnd = sync.currentPeriodEnd ?? snapshot.currentPeriodEnd;
    }

    const plan = getPlanById(snapshot.planId);
    const hasLiveSubscription =
      Boolean(snapshot.stripeSubscriptionId) &&
      ["active", "trialing", "past_due", "unpaid"].includes(
        snapshot.subscriptionStatus ?? "",
      );

    return NextResponse.json({
      balance: snapshot.balance,
      planId: hasLiveSubscription ? snapshot.planId : "free",
      planName: hasLiveSubscription
        ? (plan?.name ?? snapshot.planId)
        : "Free",
      freeTokensGranted: snapshot.freeTokensGranted,
      subscriptionStatus: snapshot.subscriptionStatus,
      currentPeriodEnd: hasLiveSubscription ? currentPeriodEnd : null,
      cancelAtPeriodEnd: hasLiveSubscription ? cancelAtPeriodEnd : false,
      hasStripeCustomer: Boolean(snapshot.stripeCustomerId),
      hasStripeSubscription: hasLiveSubscription,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load billing balance";
    console.error("[billing/balance]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
