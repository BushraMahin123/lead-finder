import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth";
import { fulfillCheckoutSessionById } from "@/lib/billing/fulfill-checkout";
import { isStripeConfigured } from "@/lib/billing/stripe";

export async function POST(request: Request) {
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

    const body = (await request.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing checkout session id" },
        { status: 400 },
      );
    }

    const result = await fulfillCheckoutSessionById(sessionId, userId);

    return NextResponse.json({
      ok: true,
      ...result,
      message:
        result.checkoutType === "subscription"
          ? result.alreadyFulfilled
            ? "Subscription already activated."
            : `Plan updated${result.planId ? ` to ${result.planId}` : ""}. ${result.tokensGranted.toLocaleString()} tokens added.`
          : result.checkoutType === "topup"
            ? result.alreadyFulfilled
              ? "Top-up already applied."
              : `${result.tokensGranted.toLocaleString()} tokens added.`
            : "Checkout processed.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to confirm checkout";
    console.error("[billing/confirm-checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
