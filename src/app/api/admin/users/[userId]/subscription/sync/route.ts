import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import { adminSyncSubscriptionFromStripe } from "@/lib/admin-billing";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await context.params;

  try {
    const subscription = await adminSyncSubscriptionFromStripe(userId);

    return NextResponse.json({
      message: subscription
        ? "Subscription synced from Stripe"
        : "No active Stripe subscription — user set to free",
      subscription,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
