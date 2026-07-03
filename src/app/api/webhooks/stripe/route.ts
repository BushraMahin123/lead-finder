import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getPlanById,
  getTopUpById,
  type PlanId,
} from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import {
  creditTokens,
  findUserIdByStripeCustomerId,
  updateBillingAccount,
} from "@/lib/billing/tokens";

export const runtime = "nodejs";

async function grantSubscriptionTokens(input: {
  userId: string;
  planId: PlanId;
  stripeEventId: string;
  description: string;
}) {
  const plan = getPlanById(input.planId);
  if (!plan || plan.monthlyTokens <= 0) return;

  await creditTokens({
    userId: input.userId,
    amount: plan.monthlyTokens,
    type: "subscription_grant",
    description: input.description,
    metadata: { planId: plan.id },
    idempotencyKey: `${input.stripeEventId}:${input.planId}`,
    stripeEventId: input.stripeEventId,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const checkoutType = session.metadata?.checkoutType;

  if (checkoutType === "topup") {
    const packId = session.metadata?.packId;
    const pack = packId ? getTopUpById(packId) : undefined;
    if (!pack) return;

    await creditTokens({
      userId,
      amount: pack.tokens,
      type: "top_up",
      description: `${pack.name} token pack`,
      metadata: { packId: pack.id, sessionId: session.id },
      idempotencyKey: `checkout_topup:${session.id}`,
      stripeEventId: session.id,
    });
    return;
  }

  if (checkoutType === "subscription") {
    const planId = session.metadata?.planId as PlanId | undefined;
    if (!planId) return;

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    await updateBillingAccount(userId, {
      planId,
      stripeCustomerId:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id,
      stripeSubscriptionId: subscriptionId ?? null,
      subscriptionStatus: "active",
    });

    await grantSubscriptionTokens({
      userId,
      planId,
      stripeEventId: session.id,
      description: `${getPlanById(planId)?.name ?? planId} subscription tokens`,
    });
  }
}

async function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const legacy = (
    invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    }
  ).subscription;

  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) {
    return legacy.id;
  }

  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;
  if (parentSub && typeof parentSub === "object" && "id" in parentSub) {
    return parentSub.id;
  }

  return null;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.billing_reason === "subscription_create") {
    return;
  }

  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  const userId = await findUserIdByStripeCustomerId(customerId);
  if (!userId) return;

  const subscriptionId = await getInvoiceSubscriptionId(invoice);

  let planId: PlanId | undefined;

  if (subscriptionId) {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    planId = subscription.metadata?.planId as PlanId | undefined;

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

    await updateBillingAccount(userId, {
      planId: planId ?? "starter",
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: subscription.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });
  }

  if (!planId) return;

  await grantSubscriptionTokens({
    userId,
    planId,
    stripeEventId: invoice.id,
    description: `${getPlanById(planId)?.name ?? planId} monthly renewal`,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await updateBillingAccount(userId, {
    planId: "free",
    stripeSubscriptionId: null,
    subscriptionStatus: "canceled",
    currentPeriodStart: null,
    currentPeriodEnd: null,
  });
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed";
    console.error("[stripe/webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
