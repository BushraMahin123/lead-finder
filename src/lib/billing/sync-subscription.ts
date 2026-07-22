import type { PlanId } from "@/lib/billing/plans";
import { fulfillCheckoutSession } from "@/lib/billing/fulfill-checkout";
import { getStripe } from "@/lib/billing/stripe";
import {
  clearStaleStripeLinks,
  isStripeModeMismatchError,
} from "@/lib/billing/stripe-mode";
import { getUserBillingSnapshot, updateBillingAccount } from "@/lib/billing/tokens";

const ACTIVE_SUB_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

function readSubscriptionPeriod(subscription: {
  current_period_start?: number | null;
  current_period_end?: number | null;
  items?: {
    data?: Array<{ current_period_start?: number; current_period_end?: number }>;
  };
}) {
  const item = subscription.items?.data?.[0];
  const start =
    typeof subscription.current_period_start === "number"
      ? subscription.current_period_start
      : typeof item?.current_period_start === "number"
        ? item.current_period_start
        : null;
  const end =
    typeof subscription.current_period_end === "number"
      ? subscription.current_period_end
      : typeof item?.current_period_end === "number"
        ? item.current_period_end
        : null;

  return {
    periodStart: start ? new Date(start * 1000).toISOString() : null,
    periodEnd: end ? new Date(end * 1000).toISOString() : null,
  };
}

/** True when Stripe has scheduled the subscription to end (portal cancel). */
export function isSubscriptionCancelScheduled(subscription: {
  cancel_at_period_end?: boolean | null;
  cancel_at?: number | null;
  status?: string | null;
}): boolean {
  if (!ACTIVE_SUB_STATUSES.has(subscription.status ?? "")) return false;
  if (subscription.cancel_at_period_end) return true;
  // Some portal configs set cancel_at instead of cancel_at_period_end.
  if (typeof subscription.cancel_at === "number" && subscription.cancel_at > 0) {
    return subscription.cancel_at * 1000 > Date.now();
  }
  return false;
}

function isMissingStripeResource(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; statusCode?: number };
  return err.code === "resource_missing" || err.statusCode === 404;
}

/** Apply any recent completed Checkout sessions (covers missed webhooks). */
async function fulfillRecentCheckoutSessions(userId: string, customerId: string) {
  const stripe = getStripe();
  const sessions = await stripe.checkout.sessions.list({
    customer: customerId,
    limit: 10,
  });

  let newestLiveSubscriptionFulfilled = false;

  for (const session of sessions.data) {
    if (session.status !== "complete") continue;
    if (session.metadata?.userId && session.metadata.userId !== userId) continue;

    const checkoutType = session.metadata?.checkoutType;
    if (checkoutType === "topup") {
      try {
        await fulfillCheckoutSession(session, { expectedUserId: userId });
      } catch (error) {
        console.error(
          "[billing/sync] failed to fulfill top-up checkout session",
          session.id,
          error,
        );
      }
      continue;
    }

    if (checkoutType !== "subscription") continue;
    if (newestLiveSubscriptionFulfilled) continue;

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (!subscriptionId) continue;

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!ACTIVE_SUB_STATUSES.has(subscription.status)) {
        continue;
      }

      newestLiveSubscriptionFulfilled = true;
      await fulfillCheckoutSession(session, {
        expectedUserId: userId,
        force: true,
      });
    } catch (error) {
      if (isMissingStripeResource(error)) continue;
      console.error(
        "[billing/sync] failed to fulfill subscription checkout session",
        session.id,
        error,
      );
    }
  }
}

export type StripeSyncResult = {
  hasSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

export async function syncStripeSubscriptionForUser(
  userId: string,
): Promise<StripeSyncResult> {
  const empty: StripeSyncResult = {
    hasSubscription: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };

  const snapshot = await getUserBillingSnapshot(userId);
  if (!snapshot.stripeCustomerId) return empty;

  const stripe = getStripe();

  try {
    await fulfillRecentCheckoutSessions(userId, snapshot.stripeCustomerId);
  } catch (error) {
    if (isStripeModeMismatchError(error)) {
      await clearStaleStripeLinks(userId);
      return empty;
    }
    console.error("[billing/sync] checkout fulfill pass failed", error);
  }

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
      return empty;
    }
    throw error;
  }

  const linked = snapshot.stripeSubscriptionId
    ? subscriptions.data.find(
        (subscription) => subscription.id === snapshot.stripeSubscriptionId,
      )
    : undefined;

  let active =
    linked && ACTIVE_SUB_STATUSES.has(linked.status)
      ? linked
      : subscriptions.data
          .filter((subscription) => ACTIVE_SUB_STATUSES.has(subscription.status))
          .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];

  // Fresh retrieve after portal cancel — list can lag on cancel_at_period_end.
  if (snapshot.stripeSubscriptionId) {
    try {
      const retrieved = await stripe.subscriptions.retrieve(
        snapshot.stripeSubscriptionId,
      );
      if (ACTIVE_SUB_STATUSES.has(retrieved.status)) {
        active = retrieved;
      }
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
    }
  }

  if (!active) {
    await updateBillingAccount(userId, {
      planId: "free",
      stripeSubscriptionId: null,
      subscriptionStatus: "canceled",
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });
    return empty;
  }

  const planId =
    (active.metadata?.planId as PlanId | undefined) ?? snapshot.planId;
  const { periodStart, periodEnd } = readSubscriptionPeriod(active);
  const cancelAtPeriodEnd = isSubscriptionCancelScheduled(active);
  const scheduledEnd =
    typeof active.cancel_at === "number" && active.cancel_at > 0
      ? new Date(active.cancel_at * 1000).toISOString()
      : periodEnd;

  await updateBillingAccount(userId, {
    planId,
    stripeSubscriptionId: active.id,
    subscriptionStatus: active.status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: scheduledEnd,
  });

  return {
    hasSubscription: true,
    cancelAtPeriodEnd,
    currentPeriodEnd: scheduledEnd,
  };
}
