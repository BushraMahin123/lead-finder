import { NextResponse } from "next/server";
import {
  FREE_LIFETIME_TOKENS,
  OVERAGE_RATE,
  SUBSCRIPTION_PLANS,
  TOP_UP_PACKS,
} from "@/lib/billing/plans";
import { TOKEN_RATES } from "@/lib/billing/token-rates";

export async function GET() {
  return NextResponse.json({
    tokenRates: TOKEN_RATES,
    freeLifetimeTokens: FREE_LIFETIME_TOKENS,
    overage: OVERAGE_RATE,
    plans: SUBSCRIPTION_PLANS,
    topUps: TOP_UP_PACKS,
  });
}
