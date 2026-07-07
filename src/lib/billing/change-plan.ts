import { adminChangeUserPlan } from "@/lib/admin-billing";
import type { PlanId } from "@/lib/billing/plans";

export async function changeUserPlan(
  userId: string,
  planId: PlanId,
): Promise<{ planId: PlanId }> {
  const result = await adminChangeUserPlan({
    userId,
    adminUserId: userId,
    planId,
    grantMonthlyTokens: false,
    syncStripe: true,
  });

  return { planId: result.planId };
}
