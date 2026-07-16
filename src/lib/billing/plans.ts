export type PlanId = "free" | "starter" | "pro" | "growth" | "agency";
export type TopUpId = "small" | "medium" | "large";

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  monthlyTokens: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  stripePriceEnvKey: string;
}

export interface TopUpPack {
  id: TopUpId;
  name: string;
  price: number;
  tokens: number;
  stripePriceEnvKey: string;
}

export const FREE_LIFETIME_TOKENS = 100;

/** Display helper — keep feature copy in sync with monthlyTokens. */
export function formatTokenGrant(tokens: number): string {
  return tokens.toLocaleString("en-US");
}

/**
 * Token grants sized for ~25% net margin per plan (worst case: all tokens on phones)
 * after API COGS (~$0.006/token), Stripe (~2.9% + $0.30), infra (~$0.40/user), and
 * platform overhead (~5% of revenue). Prices unchanged — margin via token volume.
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    monthlyTokens: 0,
    description: "Try Lead Finder with a one-time token grant.",
    features: [
      `${FREE_LIFETIME_TOKENS} tokens once (lifetime)`,
      "Lead search & saved tables",
      "Cached searches are free",
    ],
    stripePriceEnvKey: "",
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 29,
    monthlyTokens: 2_500,
    description: "For solo SDRs getting started with outbound.",
    features: [
      `${formatTokenGrant(2_500)} tokens / month`,
      "Email & phone enrichment",
      "Saved contact tables",
      "Overage available",
    ],
    stripePriceEnvKey: "STRIPE_PRICE_STARTER",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 79,
    monthlyTokens: 8_500,
    description: "For active reps running daily prospecting.",
    features: [
      `${formatTokenGrant(8_500)} tokens / month`,
      "Priority enrichment",
      "Saved contact tables",
      "Overage available",
    ],
    highlighted: true,
    stripePriceEnvKey: "STRIPE_PRICE_PRO",
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 199,
    monthlyTokens: 22_000,
    description: "For teams with heavy outbound volume.",
    features: [
      `${formatTokenGrant(22_000)} tokens / month`,
      "Team-ready usage",
      "Saved contact tables",
      "Overage available",
    ],
    stripePriceEnvKey: "STRIPE_PRICE_GROWTH",
  },
  {
    id: "agency",
    name: "Agency",
    priceMonthly: 499,
    monthlyTokens: 55_000,
    description: "For agencies managing multiple clients.",
    features: [
      `${formatTokenGrant(55_000)} tokens / month`,
      "High-volume enrichment",
      "Saved contact tables",
      "Overage available",
    ],
    stripePriceEnvKey: "STRIPE_PRICE_AGENCY",
  },
];

export const TOP_UP_PACKS: TopUpPack[] = [
  {
    id: "small",
    name: "Small pack",
    price: 15,
    tokens: 1_200,
    stripePriceEnvKey: "STRIPE_PRICE_TOPUP_SMALL",
  },
  {
    id: "medium",
    name: "Medium pack",
    price: 49,
    tokens: 5_000,
    stripePriceEnvKey: "STRIPE_PRICE_TOPUP_MEDIUM",
  },
  {
    id: "large",
    name: "Large pack",
    price: 149,
    tokens: 16_000,
    stripePriceEnvKey: "STRIPE_PRICE_TOPUP_LARGE",
  },
];

export const OVERAGE_RATE = {
  tokensPerThousand: 1_000,
  priceUsd: 12,
} as const;

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

export function getTopUpById(packId: string): TopUpPack | undefined {
  return TOP_UP_PACKS.find((pack) => pack.id === packId);
}

export function getStripePriceId(envKey: string): string | null {
  if (!envKey) return null;
  const value = process.env[envKey]?.trim();
  return value || null;
}

export function assertStripePriceId(
  priceId: string,
  planName: string,
  envKey: string,
): void {
  if (priceId.startsWith("prod_")) {
    throw new Error(
      `${envKey} is set to a Stripe Product ID (${priceId}), but Checkout requires a Price ID (price_...). Open Stripe Dashboard → Products → your ${planName} plan → copy the Price ID.`,
    );
  }
}

const PLAN_TIER: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  growth: 3,
  agency: 4,
};

export function getPlanTier(planId: string): number {
  return PLAN_TIER[planId as PlanId] ?? 0;
}

/**
 * How many tokens to add/remove so balance matches the plan's monthly allotment.
 * Positive = credit, negative = debit, null = do not adjust (e.g. Free).
 */
export function getPlanBalanceAdjustment(
  planId: string,
  currentBalance: number,
): number | null {
  const plan = getPlanById(planId);
  if (!plan || plan.monthlyTokens <= 0) return null;

  return plan.monthlyTokens - currentBalance;
}

/** @deprecated Prefer getPlanBalanceAdjustment — kept for any older call sites. */
export function getUpgradeTokenGrant(
  fromPlanId: string,
  toPlanId: string,
): number {
  if (getPlanTier(toPlanId) <= getPlanTier(fromPlanId)) return 0;

  const fromPlan = getPlanById(fromPlanId);
  const toPlan = getPlanById(toPlanId);
  if (!fromPlan || !toPlan) return 0;

  return Math.max(0, toPlan.monthlyTokens - fromPlan.monthlyTokens);
}

export type PlanCardAction =
  | "free-info"
  | "active"
  | "subscribe"
  | "upgrade"
  | "downgrade";

export function getPlanCardAction(
  currentPlanId: string,
  targetPlanId: PlanId,
): PlanCardAction {
  if (targetPlanId === "free") {
    return currentPlanId === "free" ? "free-info" : "downgrade";
  }

  if (currentPlanId === targetPlanId) {
    return "active";
  }

  if (currentPlanId === "free") {
    return "subscribe";
  }

  const currentTier = getPlanTier(currentPlanId);
  const targetTier = getPlanTier(targetPlanId);

  if (targetTier > currentTier) return "upgrade";
  if (targetTier < currentTier) return "downgrade";
  return "active";
}

export function hasPurchasedPlan(planId: string): boolean {
  return planId !== "free";
}
