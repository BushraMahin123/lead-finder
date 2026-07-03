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
    monthlyTokens: 3_000,
    description: "For solo SDRs getting started with outbound.",
    features: [
      "3,000 tokens / month",
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
    monthlyTokens: 10_000,
    description: "For active reps running daily prospecting.",
    features: [
      "10,000 tokens / month",
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
    monthlyTokens: 30_000,
    description: "For teams with heavy outbound volume.",
    features: [
      "30,000 tokens / month",
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
    monthlyTokens: 100_000,
    description: "For agencies managing multiple clients.",
    features: [
      "100,000 tokens / month",
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
    tokens: 20_000,
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
