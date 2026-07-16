import { randomUUID } from "node:crypto";
import { adminChangeUserPlan } from "@/lib/admin-billing";
import {
  getPlanBalanceAdjustment,
  getPlanById,
  getPlanTier,
  type PlanId,
} from "@/lib/billing/plans";
import {
  creditTokens,
  debitTokens,
  getUserBillingSnapshot,
} from "@/lib/billing/tokens";

export async function changeUserPlan(
  userId: string,
  planId: PlanId,
): Promise<{
  planId: PlanId;
  tokensGranted: number;
  tokensRemoved: number;
  balance: number;
  direction: "upgrade" | "downgrade" | "same";
}> {
  const snapshot = await getUserBillingSnapshot(userId);
  const previousPlanId = snapshot.planId as PlanId;
  const previousTier = getPlanTier(previousPlanId);
  const nextTier = getPlanTier(planId);
  const direction =
    nextTier > previousTier
      ? "upgrade"
      : nextTier < previousTier
        ? "downgrade"
        : "same";

  await adminChangeUserPlan({
    userId,
    adminUserId: userId,
    planId,
    grantMonthlyTokens: false,
    syncStripe: true,
  });

  let tokensGranted = 0;
  let tokensRemoved = 0;
  let balance = (await getUserBillingSnapshot(userId)).balance;

  // Paid plans: set balance to that plan's monthly allotment (e.g. Pro → 8500, Starter → 2500).
  // Free keeps the current balance so a downgrade does not wipe remaining tokens.
  const adjustment = getPlanBalanceAdjustment(planId, balance);
  const planName = getPlanById(planId)?.name ?? planId;

  if (adjustment !== null && adjustment !== 0) {
    if (adjustment > 0) {
      tokensGranted = adjustment;
      balance = await creditTokens({
        userId,
        amount: adjustment,
        type: "plan_change_sync",
        description: `Set balance to ${planName} monthly allotment`,
        metadata: {
          fromPlanId: previousPlanId,
          toPlanId: planId,
          direction,
          targetBalance: getPlanById(planId)?.monthlyTokens,
        },
        idempotencyKey: `plan_balance_sync:${userId}:${previousPlanId}:${planId}:${randomUUID()}`,
      });
    } else {
      tokensRemoved = Math.abs(adjustment);
      balance = await debitTokens({
        userId,
        amount: tokensRemoved,
        type: "plan_change_sync",
        description: `Set balance to ${planName} monthly allotment`,
        metadata: {
          fromPlanId: previousPlanId,
          toPlanId: planId,
          direction,
          targetBalance: getPlanById(planId)?.monthlyTokens,
        },
        idempotencyKey: `plan_balance_sync:${userId}:${previousPlanId}:${planId}:${randomUUID()}`,
      });
    }
  }

  return { planId, tokensGranted, tokensRemoved, balance, direction };
}
