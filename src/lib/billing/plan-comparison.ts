import type { PlanId } from "@/lib/billing/plans";

export type ComparisonFeature = {
  label: string;
  values: Record<PlanId, string | boolean>;
};

export const PLAN_COMPARISON: ComparisonFeature[] = [
  {
    label: "Monthly tokens",
    values: {
      free: "100 (lifetime)",
      starter: "3,000",
      pro: "10,000",
      growth: "30,000",
      agency: "100,000",
    },
  },
  {
    label: "Lead search",
    values: {
      free: true,
      starter: true,
      pro: true,
      growth: true,
      agency: true,
    },
  },
  {
    label: "Email enrichment",
    values: {
      free: true,
      starter: true,
      pro: true,
      growth: true,
      agency: true,
    },
  },
  {
    label: "Phone enrichment",
    values: {
      free: true,
      starter: true,
      pro: true,
      growth: true,
      agency: true,
    },
  },
  {
    label: "Saved contact tables",
    values: {
      free: true,
      starter: true,
      pro: true,
      growth: true,
      agency: true,
    },
  },
  {
    label: "AI-assisted search",
    values: {
      free: true,
      starter: true,
      pro: true,
      growth: true,
      agency: true,
    },
  },
  {
    label: "Priority enrichment",
    values: {
      free: false,
      starter: false,
      pro: true,
      growth: true,
      agency: true,
    },
  },
  {
    label: "Team-ready usage",
    values: {
      free: false,
      starter: false,
      pro: false,
      growth: true,
      agency: true,
    },
  },
  {
    label: "High-volume enrichment",
    values: {
      free: false,
      starter: false,
      pro: false,
      growth: false,
      agency: true,
    },
  },
  {
    label: "Overage billing",
    values: {
      free: false,
      starter: true,
      pro: true,
      growth: true,
      agency: true,
    },
  },
];

export const ANNUAL_DISCOUNT = 0.2;

export function getDisplayPrice(monthly: number, annual: boolean): number {
  if (monthly === 0) return 0;
  if (!annual) return monthly;
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT));
}
