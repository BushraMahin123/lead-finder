import { updateBillingAccount } from "@/lib/billing/tokens";

export function isStripeModeMismatchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /a similar object exists in (test|live) mode/i.test(message);
}

export async function clearStaleStripeLinks(userId: string): Promise<void> {
  await updateBillingAccount(userId, {
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
  });
}
