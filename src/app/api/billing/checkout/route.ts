import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClaims, getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { getPlanById, getTopUpById, type PlanId, type TopUpId } from "@/lib/billing/plans";
import {
  createSubscriptionCheckoutSession,
  createTopUpCheckoutSession,
  isStripeConfigured,
} from "@/lib/billing/stripe";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY and price IDs." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      type?: "subscription" | "topup";
      planId?: PlanId;
      packId?: TopUpId;
    };

    const claims = await getAuthenticatedClaims();
    const email =
      typeof claims?.email === "string" ? claims.email : null;

    if (body.type === "subscription") {
      const planId = body.planId;
      if (!planId || planId === "free") {
        return NextResponse.json({ error: "Choose a paid plan" }, { status: 400 });
      }

      const plan = getPlanById(planId);
      if (!plan || plan.priceMonthly <= 0) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }

      const session = await createSubscriptionCheckoutSession({
        userId,
        email,
        planId,
      });

      return NextResponse.json({ url: session.url });
    }

    if (body.type === "topup") {
      const pack = body.packId ? getTopUpById(body.packId) : undefined;
      if (!pack) {
        return NextResponse.json({ error: "Invalid top-up pack" }, { status: 400 });
      }

      const session = await createTopUpCheckoutSession({
        userId,
        email,
        packId: pack.id,
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "Invalid checkout type" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    console.error("[billing/checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
