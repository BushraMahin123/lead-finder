import type { PlanId } from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import {
  clearStaleStripeLinks,
  isStripeModeMismatchError,
} from "@/lib/billing/stripe-mode";
import { getUserBillingSnapshot, updateBillingAccount } from "@/lib/billing/tokens";

function readSubscriptionPeriod(subscription: unknown) {
  const period = subscription as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const periodStart =
    typeof period.current_period_start === "number"
      ? new Date(period.current_period_start * 1000).toISOString()
      : null;
  const periodEnd =
    typeof period.current_period_end === "number"
      ? new Date(period.current_period_end * 1000).toISOString()
      : null;

  return { periodStart, periodEnd };
}

/** Link an existing Stripe subscription to the user when webhooks were missed. */
export async function syncStripeSubscriptionForUser(
  userId: string,
): Promise<boolean> {
  const snapshot = await getUserBillingSnapshot(userId);
  if (snapshot.stripeSubscriptionId) return true;
  if (!snapshot.stripeCustomerId) return false;

  const stripe = getStripe();

  let subscriptions;
  try {
    subscriptions = await stripe.subscriptions.list({
      customer: snapshot.stripeCustomerId,
      status: "all",
      limit: 10,
    });
  } catch (error) {
    if (isStripeModeMismatchError(error)) {
      await clearStaleStripeLinks(userId);
      return false;
    }
    throw error;
  }

  const active = subscriptions.data.find((subscription) =>
    ["active", "trialing", "past_due", "unpaid"].includes(subscription.status),
  );

  if (!active) return false;

  const planId =
    (active.metadata?.planId as PlanId | undefined) ?? snapshot.planId;
  const { periodStart, periodEnd } = readSubscriptionPeriod(active);

  await updateBillingAccount(userId, {
    planId,
    stripeSubscriptionId: active.id,
    subscriptionStatus: active.status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });

  return true;
}
