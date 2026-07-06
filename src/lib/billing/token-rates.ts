/** 1 token ≈ $0.01 retail value */
export const TOKEN_RATES = {
  lead: 1,
  email: 3,
  phone: 25,
  aiParse: 1,
  aiColumn: 2,
} as const;

export function calculateSaveTokenCost(
  count: number,
  enrichEmail: boolean,
  enrichPhone: boolean,
): {
  leads: number;
  email: number;
  phone: number;
  total: number;
} {
  const leads = count * TOKEN_RATES.lead;
  const email = enrichEmail ? count * TOKEN_RATES.email : 0;
  const phone = enrichPhone ? count * TOKEN_RATES.phone : 0;

  return {
    leads,
    email,
    phone,
    total: leads + email + phone,
  };
}

export function calculateEnrichTokenCost(
  type: "email" | "phone",
  freshCount: number,
): number {
  return freshCount * TOKEN_RATES[type];
}

export function formatTokenAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
