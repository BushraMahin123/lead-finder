import {
  calculateSaveTokenCost,
  formatTokenAmount,
  TOKEN_RATES,
} from "@/lib/billing/token-rates";
import { MAX_SAVE_CONTACTS, SAVE_AMOUNT_PRESETS } from "@/lib/save-contacts-limits";

export { MAX_SAVE_CONTACTS, SAVE_AMOUNT_PRESETS };

export const CREDIT_RATES = TOKEN_RATES;

export interface SaveCreditsBreakdown {
  contacts: number;
  email: number;
  phone: number;
  total: number;
}

export function calculateSaveCredits(
  count: number,
  enrichEmail: boolean,
  enrichPhone: boolean,
): SaveCreditsBreakdown {
  const breakdown = calculateSaveTokenCost(count, enrichEmail, enrichPhone);
  return {
    contacts: breakdown.leads,
    email: breakdown.email,
    phone: breakdown.phone,
    total: breakdown.total,
  };
}

export function formatCredits(value: number): string {
  return formatTokenAmount(value);
}

export function clampSaveCount(value: number, maxAvailable: number): number {
  const cap = Math.min(MAX_SAVE_CONTACTS, maxAvailable);
  return Math.max(1, Math.min(cap, Math.floor(value)));
}
