import {
  calculateSaveTokenCost,
  formatTokenAmount,
  TOKEN_RATES,
} from "@/lib/billing/token-rates";
import { SAVE_AMOUNT_PRESETS, SAVE_CONTACTS_PER_REQUEST } from "@/lib/save-contacts-limits";

export { SAVE_AMOUNT_PRESETS, SAVE_CONTACTS_PER_REQUEST };

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

/** Clamp to available matches and the single-save cap. */
export function clampSaveCount(value: number, maxAvailable: number): number {
  const cap = Math.max(
    1,
    Math.min(Math.floor(maxAvailable), SAVE_CONTACTS_PER_REQUEST),
  );
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.min(cap, Math.floor(value)));
}
