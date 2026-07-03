import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import {
  createBillingPortalSession,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import { getUserBillingSnapshot } from "@/lib/billing/tokens";

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured yet." },
        { status: 503 },
      );
    }

    const snapshot = await getUserBillingSnapshot(userId);
    if (!snapshot.stripeCustomerId) {
      return NextResponse.json(
        { error: "Subscribe to a paid plan before managing billing." },
        { status: 400 },
      );
    }

    const session = await createBillingPortalSession(userId);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to open billing portal";
    console.error("[billing/portal]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
