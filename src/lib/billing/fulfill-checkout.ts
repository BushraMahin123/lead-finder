import type Stripe from "stripe";
import {
  getPlanById,
  getPlanTier,
  getTopUpById,
  type PlanId,
} from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import {
  creditTokens,
  getUserBillingSnapshot,
  updateBillingAccount,
} from "@/lib/billing/tokens";

export type FulfillCheckoutResult = {
  checkoutType: "subscription" | "topup" | "unknown";
  planId?: PlanId;
  tokensGranted: number;
  balance?: number;
  alreadyFulfilled: boolean;
};

const ACTIVE_SUB_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

function isMissingStripeResource(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; statusCode?: number };
  return err.code === "resource_missing" || err.statusCode === 404;
}

async function cancelSubscriptionIfExists(subscriptionId: string) {
  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    if (isMissingStripeResource(error)) return;
    console.warn(
      "[billing/fulfill] could not cancel previous subscription",
      subscriptionId,
      error instanceof Error ? error.message : error,
    );
  }
}

async function getSubscriptionStatus(
  subscriptionId: string,
): Promise<string | null> {
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.status;
  } catch (error) {
    if (isMissingStripeResource(error)) return "canceled";
    throw error;
  }
}

async function grantSubscriptionTokens(input: {
  userId: string;
  planId: PlanId;
  stripeEventId: string;
  description: string;
}): Promise<number> {
  const plan = getPlanById(input.planId);
  if (!plan || plan.monthlyTokens <= 0) {
    const snapshot = await getUserBillingSnapshot(input.userId);
    return snapshot.balance;
  }

  return creditTokens({
    userId: input.userId,
    amount: plan.monthlyTokens,
    type: "subscription_grant",
    description: input.description,
    metadata: { planId: plan.id },
    idempotencyKey: `${input.stripeEventId}:${input.planId}`,
    stripeEventId: input.stripeEventId,
  });
}

/**
 * Apply Checkout Session results to the billing account.
 * Safe to call from webhook and from the success-page confirm endpoint (idempotent).
 */
export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
  options?: {
    expectedUserId?: string;
    /** When true (confirm/webhook), always apply this paid session if its subscription is live. */
    force?: boolean;
  },
): Promise<FulfillCheckoutResult> {
  const userId = session.metadata?.userId;
  if (!userId) {
    throw new Error("Checkout session is missing user metadata");
  }

  if (options?.expectedUserId && options.expectedUserId !== userId) {
    throw new Error("Checkout session does not belong to this user");
  }

  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required" &&
    session.status !== "complete"
  ) {
    throw new Error("Checkout session is not paid yet");
  }

  const checkoutType = session.metadata?.checkoutType;

  if (checkoutType === "topup") {
    const packId = session.metadata?.packId;
    const pack = packId ? getTopUpById(packId) : undefined;
    if (!pack) {
      throw new Error("Invalid top-up pack on checkout session");
    }

    const before = await getUserBillingSnapshot(userId);
    const balance = await creditTokens({
      userId,
      amount: pack.tokens,
      type: "top_up",
      description: `${pack.name} token pack`,
      metadata: { packId: pack.id, sessionId: session.id },
      idempotencyKey: `checkout_topup:${session.id}`,
      stripeEventId: session.id,
    });

    return {
      checkoutType: "topup",
      tokensGranted: balance > before.balance ? pack.tokens : 0,
      balance,
      alreadyFulfilled: balance === before.balance,
    };
  }

  if (checkoutType === "subscription") {
    const planId = session.metadata?.planId as PlanId | undefined;
    if (!planId) {
      throw new Error("Checkout session is missing plan metadata");
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      throw new Error("Checkout session is missing subscription id");
    }

    const subscriptionStatus = await getSubscriptionStatus(subscriptionId);

    // Never re-apply an old checkout whose subscription was already canceled.
    if (!subscriptionStatus || !ACTIVE_SUB_STATUSES.has(subscriptionStatus)) {
      const previous = await getUserBillingSnapshot(userId);
      return {
        checkoutType: "subscription",
        planId: previous.planId as PlanId,
        tokensGranted: 0,
        balance: previous.balance,
        alreadyFulfilled: true,
      };
    }

    const previous = await getUserBillingSnapshot(userId);
    const previousSubscriptionId = previous.stripeSubscriptionId;

    // Already applied this exact subscription checkout.
    if (
      previous.planId === planId &&
      previous.stripeSubscriptionId === subscriptionId &&
      ACTIVE_SUB_STATUSES.has(previous.subscriptionStatus ?? "")
    ) {
      return {
        checkoutType: "subscription",
        planId,
        tokensGranted: 0,
        balance: previous.balance,
        alreadyFulfilled: true,
      };
    }

    // During background sync only: don't let a stale lower-tier session overwrite
    // a different subscription that is still marked active locally.
    // Confirm/webhook always apply the paid session (force).
    if (
      !options?.force &&
      previousSubscriptionId &&
      previousSubscriptionId !== subscriptionId &&
      ACTIVE_SUB_STATUSES.has(previous.subscriptionStatus ?? "") &&
      getPlanTier(previous.planId) > getPlanTier(planId)
    ) {
      return {
        checkoutType: "subscription",
        planId: previous.planId as PlanId,
        tokensGranted: 0,
        balance: previous.balance,
        alreadyFulfilled: true,
      };
    }

    await updateBillingAccount(userId, {
      planId,
      stripeCustomerId:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: subscriptionStatus,
    });

    const balanceBeforeGrant = (await getUserBillingSnapshot(userId)).balance;
    const balance = await grantSubscriptionTokens({
      userId,
      planId,
      stripeEventId: session.id,
      description: `${getPlanById(planId)?.name ?? planId} subscription tokens`,
    });

    const tokensGranted = Math.max(0, balance - balanceBeforeGrant);

    // New Checkout subscription replaces the previous one.
    if (previousSubscriptionId && previousSubscriptionId !== subscriptionId) {
      await cancelSubscriptionIfExists(previousSubscriptionId);
    }

    return {
      checkoutType: "subscription",
      planId,
      tokensGranted,
      balance,
      alreadyFulfilled: tokensGranted === 0,
    };
  }

  return {
    checkoutType: "unknown",
    tokensGranted: 0,
    alreadyFulfilled: true,
  };
}

export async function fulfillCheckoutSessionById(
  sessionId: string,
  expectedUserId: string,
): Promise<FulfillCheckoutResult> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return fulfillCheckoutSession(session, {
    expectedUserId,
    force: true,
  });
}
