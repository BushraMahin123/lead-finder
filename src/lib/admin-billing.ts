import type Stripe from "stripe";
import {
  getPlanById,
  getStripePriceId,
  SUBSCRIPTION_PLANS,
  type PlanId,
} from "@/lib/billing/plans";
import {
  createBillingPortalSession,
  getStripe,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import {
  creditTokens,
  getUserBillingSnapshot,
  updateBillingAccount,
} from "@/lib/billing/tokens";

export type AdminStripeInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
};

export type AdminStripeSubscription = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  planId: string | null;
};

export type AdminStripeContext = {
  configured: boolean;
  dashboardCustomerUrl: string | null;
  customerId: string | null;
  subscription: AdminStripeSubscription | null;
  invoices: AdminStripeInvoice[];
};

function adminMetadata(adminUserId: string, extra?: Record<string, unknown>) {
  return {
    adminUserId,
    adminActionAt: new Date().toISOString(),
    ...extra,
  };
}

function readSubscriptionPeriod(subscription: Stripe.Subscription) {
  const periodStart =
    "current_period_start" in subscription &&
    typeof subscription.current_period_start === "number"
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null;
  const periodEnd =
    "current_period_end" in subscription &&
    typeof subscription.current_period_end === "number"
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

  return { periodStart, periodEnd };
}

export function getStripeCustomerDashboardUrl(customerId: string): string {
  const isTest = process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_test");
  const prefix = isTest
    ? "https://dashboard.stripe.com/test"
    : "https://dashboard.stripe.com";
  return `${prefix}/customers/${customerId}`;
}

export function getStripeSubscriptionDashboardUrl(subscriptionId: string): string {
  const isTest = process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_test");
  const prefix = isTest
    ? "https://dashboard.stripe.com/test"
    : "https://dashboard.stripe.com";
  return `${prefix}/subscriptions/${subscriptionId}`;
}

function mapInvoice(invoice: Stripe.Invoice): AdminStripeInvoice {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    createdAt: new Date(invoice.created * 1000).toISOString(),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    pdfUrl: invoice.invoice_pdf ?? null,
  };
}

function mapSubscription(subscription: Stripe.Subscription): AdminStripeSubscription {
  const { periodStart, periodEnd } = readSubscriptionPeriod(subscription);

  return {
    id: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    planId: (subscription.metadata?.planId as string | undefined) ?? null,
  };
}

export async function getAdminStripeContext(
  userId: string,
): Promise<AdminStripeContext> {
  const snapshot = await getUserBillingSnapshot(userId);

  if (!isStripeConfigured() || !snapshot.stripeCustomerId) {
    return {
      configured: isStripeConfigured(),
      dashboardCustomerUrl: snapshot.stripeCustomerId
        ? getStripeCustomerDashboardUrl(snapshot.stripeCustomerId)
        : null,
      customerId: snapshot.stripeCustomerId,
      subscription: null,
      invoices: [],
    };
  }

  const stripe = getStripe();
  const [invoices, subscription] = await Promise.all([
    stripe.invoices.list({
      customer: snapshot.stripeCustomerId,
      limit: 10,
    }),
    snapshot.stripeSubscriptionId
      ? stripe.subscriptions.retrieve(snapshot.stripeSubscriptionId)
      : Promise.resolve(null),
  ]);

  return {
    configured: true,
    dashboardCustomerUrl: getStripeCustomerDashboardUrl(snapshot.stripeCustomerId),
    customerId: snapshot.stripeCustomerId,
    subscription: subscription ? mapSubscription(subscription) : null,
    invoices: invoices.data.map(mapInvoice),
  };
}

export async function createAdminBillingPortalUrl(
  userId: string,
): Promise<string> {
  const session = await createBillingPortalSession(userId);
  return session.url;
}

async function updateStripeSubscriptionPlan(input: {
  userId: string;
  subscriptionId: string;
  planId: Exclude<PlanId, "free">;
  /** When true, invoice and charge the prorated upgrade immediately. */
  chargeImmediately?: boolean;
}) {
  const plan = getPlanById(input.planId);
  if (!plan || plan.id === "free") {
    throw new Error("Invalid subscription plan");
  }

  const priceId = getStripePriceId(plan.stripePriceEnvKey);
  if (!priceId) {
    throw new Error(
      `Stripe price is not configured for ${plan.name}. Set ${plan.stripePriceEnvKey}.`,
    );
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) {
    throw new Error("Stripe subscription has no line items");
  }

  const chargeImmediately = Boolean(input.chargeImmediately);

  try {
    const updated = await stripe.subscriptions.update(input.subscriptionId, {
      items: [{ id: itemId, price: priceId }],
      metadata: {
        userId: input.userId,
        planId: plan.id,
      },
      // Upgrades: invoice the price difference now and require payment to succeed.
      // Downgrades / admin: switch price with no immediate charge.
      proration_behavior: chargeImmediately ? "always_invoice" : "none",
      ...(chargeImmediately
        ? { payment_behavior: "error_if_incomplete" as const }
        : {}),
    });

    const { periodStart, periodEnd } = readSubscriptionPeriod(updated);

    await updateBillingAccount(input.userId, {
      planId: plan.id,
      stripeSubscriptionId: updated.id,
      subscriptionStatus: updated.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    return updated;
  } catch (error) {
    if (chargeImmediately) {
      const message =
        error instanceof Error ? error.message : "Payment failed";
      throw new Error(
        `Upgrade payment failed. Your plan was not changed and no tokens were granted. ${message}`,
      );
    }
    throw error;
  }
}

export async function adminChangeUserPlan(input: {
  userId: string;
  adminUserId: string;
  planId: PlanId;
  grantMonthlyTokens?: boolean;
  syncStripe?: boolean;
  /** Charge the prorated difference immediately (user upgrades). */
  chargeImmediately?: boolean;
  note?: string;
}): Promise<{ planId: PlanId; balance?: number }> {
  const plan = getPlanById(input.planId);
  if (!plan) throw new Error("Invalid plan");

  const snapshot = await getUserBillingSnapshot(input.userId);
  const shouldSyncStripe = input.syncStripe !== false && isStripeConfigured();

  if (input.planId === "free") {
    if (shouldSyncStripe && snapshot.stripeSubscriptionId) {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(snapshot.stripeSubscriptionId);
    }

    await updateBillingAccount(input.userId, {
      planId: "free",
      stripeSubscriptionId: null,
      subscriptionStatus: snapshot.stripeSubscriptionId ? "canceled" : null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });
  } else if (
    shouldSyncStripe &&
    snapshot.stripeSubscriptionId &&
    ["active", "trialing", "past_due"].includes(
      snapshot.subscriptionStatus ?? "",
    )
  ) {
    await updateStripeSubscriptionPlan({
      userId: input.userId,
      subscriptionId: snapshot.stripeSubscriptionId,
      planId: input.planId,
      chargeImmediately: input.chargeImmediately,
    });
  } else {
    await updateBillingAccount(input.userId, {
      planId: input.planId,
      subscriptionStatus: snapshot.subscriptionStatus,
    });
  }

  let balance: number | undefined;
  if (input.grantMonthlyTokens && plan.monthlyTokens > 0) {
    balance = await creditTokens({
      userId: input.userId,
      amount: plan.monthlyTokens,
      type: "admin_plan_grant",
      description:
        input.note ?? `Admin plan change to ${plan.name} with monthly tokens`,
      metadata: adminMetadata(input.adminUserId, { planId: plan.id }),
      idempotencyKey: `admin_plan_grant:${input.userId}:${Date.now()}:${input.adminUserId}`,
    });
  }

  return { planId: input.planId, balance };
}

export async function adminCancelSubscription(input: {
  userId: string;
  adminUserId: string;
  immediate?: boolean;
  note?: string;
}): Promise<{ status: string }> {
  const snapshot = await getUserBillingSnapshot(input.userId);
  if (!snapshot.stripeSubscriptionId) {
    throw new Error("This user has no Stripe subscription to cancel");
  }

  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  const stripe = getStripe();

  if (input.immediate) {
    const canceled = await stripe.subscriptions.cancel(
      snapshot.stripeSubscriptionId,
    );

    await updateBillingAccount(input.userId, {
      planId: "free",
      stripeSubscriptionId: null,
      subscriptionStatus: canceled.status,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });

    return { status: canceled.status };
  }

  const updated = await stripe.subscriptions.update(
    snapshot.stripeSubscriptionId,
    { cancel_at_period_end: true },
  );

  const { periodStart, periodEnd } = readSubscriptionPeriod(updated);

  await updateBillingAccount(input.userId, {
    subscriptionStatus: updated.status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });

  return { status: "cancel_at_period_end" };
}

export async function adminSyncSubscriptionFromStripe(
  userId: string,
): Promise<AdminStripeSubscription | null> {
  const snapshot = await getUserBillingSnapshot(userId);
  if (!snapshot.stripeCustomerId) {
    throw new Error("No Stripe customer linked to this user");
  }

  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  const stripe = getStripe();
  const subscriptions = await stripe.subscriptions.list({
    customer: snapshot.stripeCustomerId,
    status: "all",
    limit: 10,
  });

  const active = subscriptions.data.find((subscription) =>
    ["active", "trialing", "past_due", "unpaid"].includes(subscription.status),
  );

  if (!active) {
    await updateBillingAccount(userId, {
      planId: "free",
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });
    return null;
  }

  const planId =
    (active.metadata?.planId as PlanId | undefined) ??
    (snapshot.planId as PlanId);
  const { periodStart, periodEnd } = readSubscriptionPeriod(active);

  await updateBillingAccount(userId, {
    planId,
    stripeSubscriptionId: active.id,
    subscriptionStatus: active.status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });

  return mapSubscription(active);
}

export async function adminCompPlanAndTokens(input: {
  userId: string;
  adminUserId: string;
  planId: PlanId;
  tokenAmount?: number;
  syncStripe?: boolean;
  note?: string;
}): Promise<{ planId: PlanId; balance: number; tokensGranted: number }> {
  const plan = getPlanById(input.planId);
  if (!plan) throw new Error("Invalid plan");

  const tokensToGrant =
    input.tokenAmount !== undefined ? input.tokenAmount : plan.monthlyTokens;

  await adminChangeUserPlan({
    userId: input.userId,
    adminUserId: input.adminUserId,
    planId: input.planId,
    syncStripe: input.syncStripe,
    note: input.note,
  });

  let balance = (await getUserBillingSnapshot(input.userId)).balance;

  if (tokensToGrant > 0) {
    balance = await creditTokens({
      userId: input.userId,
      amount: tokensToGrant,
      type: "admin_comp",
      description:
        input.note ??
        `Admin comp: ${plan.name} plan + ${tokensToGrant.toLocaleString()} tokens`,
      metadata: adminMetadata(input.adminUserId, {
        planId: plan.id,
        comp: true,
      }),
      idempotencyKey: `admin_comp:${input.userId}:${Date.now()}:${input.adminUserId}`,
    });
  }

  return {
    planId: input.planId,
    balance,
    tokensGranted: tokensToGrant,
  };
}

export function listAssignablePlans() {
  return SUBSCRIPTION_PLANS.map((plan) => ({
    id: plan.id,
    name: plan.name,
    monthlyTokens: plan.monthlyTokens,
    priceMonthly: plan.priceMonthly,
  }));
}
