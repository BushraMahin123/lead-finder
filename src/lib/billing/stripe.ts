import Stripe from "stripe";
import {
  getPlanById,
  getStripePriceId,
  assertStripePriceId,
  getTopUpById,
  type PlanId,
  type TopUpId,
} from "@/lib/billing/plans";
import {
  ensureUserBillingAccount,
  getUserBillingSnapshot,
  updateBillingAccount,
} from "@/lib/billing/tokens";
import {
  clearStaleStripeLinks,
  isStripeModeMismatchError,
} from "@/lib/billing/stripe-mode";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Stripe is not configured");
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !(process.env.NODE_ENV === "production" && isLocalhostUrl(configured))) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

async function getOrCreateStripeCustomer(userId: string, email?: string | null) {
  await ensureUserBillingAccount(userId);
  const snapshot = await getUserBillingSnapshot(userId);
  const stripe = getStripe();

  if (snapshot.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(snapshot.stripeCustomerId);
      return snapshot.stripeCustomerId;
    } catch (error) {
      if (isStripeModeMismatchError(error)) {
        await clearStaleStripeLinks(userId);
      } else {
        throw error;
      }
    }
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { userId },
  });

  await updateBillingAccount(userId, {
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

export async function createSubscriptionCheckoutSession(input: {
  userId: string;
  email?: string | null;
  planId: Exclude<PlanId, "free">;
}) {
  const plan = getPlanById(input.planId);
  if (!plan || plan.id === "free") {
    throw new Error("Invalid subscription plan");
  }

  const priceId = getStripePriceId(plan.stripePriceEnvKey);
  if (!priceId) {
    throw new Error(
      `Stripe price is not configured for ${plan.name}. Set ${plan.stripePriceEnvKey} in your environment.`,
    );
  }
  assertStripePriceId(priceId, plan.name, plan.stripePriceEnvKey);

  const customerId = await getOrCreateStripeCustomer(input.userId, input.email);
  const stripe = getStripe();
  const appUrl = getAppUrl();

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: {
      userId: input.userId,
      planId: plan.id,
      checkoutType: "subscription",
    },
    subscription_data: {
      metadata: {
        userId: input.userId,
        planId: plan.id,
      },
    },
  });
}

export async function createTopUpCheckoutSession(input: {
  userId: string;
  email?: string | null;
  packId: TopUpId;
}) {
  const pack = getTopUpById(input.packId);
  if (!pack) {
    throw new Error("Invalid top-up pack");
  }

  const priceId = getStripePriceId(pack.stripePriceEnvKey);
  if (!priceId) {
    throw new Error(
      `Stripe price is not configured for ${pack.name}. Set ${pack.stripePriceEnvKey} in your environment.`,
    );
  }
  assertStripePriceId(priceId, pack.name, pack.stripePriceEnvKey);

  const customerId = await getOrCreateStripeCustomer(input.userId, input.email);
  const stripe = getStripe();
  const appUrl = getAppUrl();

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: {
      userId: input.userId,
      packId: pack.id,
      checkoutType: "topup",
      tokenAmount: String(pack.tokens),
    },
  });
}

export async function createBillingPortalSession(userId: string) {
  const snapshot = await getUserBillingSnapshot(userId);
  if (!snapshot.stripeCustomerId) {
    throw new Error("No Stripe customer found for this account");
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  return stripe.billingPortal.sessions.create({
    customer: snapshot.stripeCustomerId,
    return_url: `${appUrl}/pricing`,
  });
}
