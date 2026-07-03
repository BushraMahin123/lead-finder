import { NextResponse } from "next/server";
import { InsufficientTokensError } from "@/lib/billing/tokens";

export function insufficientTokensResponse(error: InsufficientTokensError) {
  return NextResponse.json(
    {
      error: error.message,
      code: "INSUFFICIENT_TOKENS",
      balance: error.balance,
      required: error.required,
    },
    { status: 402 },
  );
}
