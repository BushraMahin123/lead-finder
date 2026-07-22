import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillCheckoutSession } from "@/lib/billing/fulfill-checkout";
import { getStripe } from "@/lib/billing/stripe";
import {
  creditTokens,
  findUserIdByStripeCustomerId,
  getUserBillingSnapshot,
  updateBillingAccount,
} from "@/lib/billing/tokens";
import { getPlanById, type PlanId } from "@/lib/billing/plans";

export const runtime = "nodejs";

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
  // Initial subscribe / upgrade tokens come from checkout fulfillment.
  // Only monthly renewals should grant a fresh allotment here.
  if (
    invoice.billing_reason === "subscription_create" ||
    invoice.billing_reason === "subscription_update"
  ) {
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

  const plan = getPlanById(planId);
  if (!plan || plan.monthlyTokens <= 0) return;

  await creditTokens({
    userId,
    amount: plan.monthlyTokens,
    type: "subscription_grant",
    description: `${plan.name} monthly renewal`,
    metadata: { planId: plan.id },
    idempotencyKey: `${invoice.id}:${planId}`,
    stripeEventId: invoice.id,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const snapshot = await getUserBillingSnapshot(userId);
  if (
    snapshot.stripeSubscriptionId &&
    snapshot.stripeSubscriptionId !== subscription.id
  ) {
    return;
  }

  const planId =
    (subscription.metadata?.planId as PlanId | undefined) ?? snapshot.planId;

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
    planId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const snapshot = await getUserBillingSnapshot(userId);
  // Ignore cancels of an old plan after an upgrade Checkout created a new subscription.
  if (
    snapshot.stripeSubscriptionId &&
    snapshot.stripeSubscriptionId !== subscription.id
  ) {
    return;
  }

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
        await fulfillCheckoutSession(event.data.object, { force: true });
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
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
