import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin";
import {
  createAdminBillingPortalUrl,
  getAdminStripeContext,
  getStripeCustomerDashboardUrl,
  getStripeSubscriptionDashboardUrl,
} from "@/lib/admin-billing";
import { getUserBillingSnapshot } from "@/lib/billing/tokens";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await context.params;

  try {
    const [snapshot, stripe] = await Promise.all([
      getUserBillingSnapshot(userId),
      getAdminStripeContext(userId),
    ]);

    let portalUrl: string | null = null;
    if (snapshot.stripeCustomerId) {
      try {
        portalUrl = await createAdminBillingPortalUrl(userId);
      } catch {
        portalUrl = null;
      }
    }

    return NextResponse.json({
      stripe: {
        ...stripe,
        portalUrl,
        subscriptionDashboardUrl: snapshot.stripeSubscriptionId
          ? getStripeSubscriptionDashboardUrl(snapshot.stripeSubscriptionId)
          : null,
        dashboardCustomerUrl: snapshot.stripeCustomerId
          ? getStripeCustomerDashboardUrl(snapshot.stripeCustomerId)
          : null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Stripe data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
