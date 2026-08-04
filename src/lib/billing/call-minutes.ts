import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserBillingSnapshot } from "@/lib/billing/tokens";

export class InsufficientCallMinutesError extends Error {
  balance: number;
  required: number;

  constructor(balance: number, required: number) {
    super(
      `Insufficient calling minutes. Need ${required}, have ${balance}. Buy the Unlimited calling package on Pricing, or contact us for Custom.`,
    );
    this.name = "InsufficientCallMinutesError";
    this.balance = balance;
    this.required = required;
  }
}

function getAdminOrThrow() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }
  return admin;
}

function parseInsufficientMinutes(
  error: unknown,
): InsufficientCallMinutesError | null {
  if (!error || typeof error !== "object") return null;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  const match = message.match(
    /^insufficient_call_minutes:([0-9.]+):([0-9.]+)$/,
  );
  if (!match) return null;

  return new InsufficientCallMinutesError(Number(match[1]), Number(match[2]));
}

async function applyCallMinuteChange(input: {
  userId: string;
  amount: number;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  stripeEventId?: string;
}): Promise<{ balance: number; duplicate: boolean }> {
  const admin = getAdminOrThrow();

  const { data, error } = await admin.rpc("apply_call_minute_change", {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_type: input.type,
    p_description: input.description ?? null,
    p_metadata: input.metadata ?? {},
    p_idempotency_key: input.idempotencyKey ?? null,
    p_stripe_event_id: input.stripeEventId ?? null,
  });

  if (error) {
    const insufficient = parseInsufficientMinutes(error);
    if (insufficient) throw insufficient;
    throw new Error(error.message);
  }

  const payload = data as {
    balance: number;
    duplicate?: boolean;
  };

  return {
    balance: Number(payload.balance ?? 0),
    duplicate: Boolean(payload.duplicate),
  };
}

export async function getCallMinuteBalance(userId: string): Promise<number> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from("user_call_minute_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Number(data?.balance ?? 0);
}

export async function ensureCallMinuteBalanceRow(userId: string): Promise<void> {
  const admin = getAdminOrThrow();
  const { error } = await admin.from("user_call_minute_balances").upsert(
    { user_id: userId },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

export async function creditCallMinutes(input: {
  userId: string;
  amount: number;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  stripeEventId?: string;
}): Promise<number> {
  if (input.amount <= 0) {
    throw new Error("Credit amount must be positive");
  }

  await ensureCallMinuteBalanceRow(input.userId);
  const result = await applyCallMinuteChange(input);
  return result.balance;
}

export async function debitCallMinutes(input: {
  userId: string;
  amount: number;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<number> {
  if (input.amount <= 0) {
    return getCallMinuteBalance(input.userId);
  }

  await ensureCallMinuteBalanceRow(input.userId);
  const result = await applyCallMinuteChange({
    ...input,
    amount: -input.amount,
  });
  return result.balance;
}

export async function assertHasCallMinutes(userId: string): Promise<number> {
  const balance = await getCallMinuteBalance(userId);
  if (balance <= 0) {
    throw new InsufficientCallMinutesError(balance, 1);
  }
  return balance;
}

/** Billable minutes from connected talk time (minimum 1 minute if any talk time). */
export function billableCallMinutes(durationSeconds: number | null | undefined): number {
  const seconds = Math.max(0, Number(durationSeconds ?? 0));
  if (seconds <= 0) return 0;
  return Math.max(1, Math.ceil(seconds / 60));
}

const ACTIVE_CALLING_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

export class CallingSubscriptionRequiredError extends Error {
  constructor() {
    super(
      "Subscribe to Unlimited calling to get a phone number and place calls.",
    );
    this.name = "CallingSubscriptionRequiredError";
  }
}

export async function hasActiveCallingSubscription(
  userId: string,
): Promise<boolean> {
  const snapshot = await getUserBillingSnapshot(userId);
  if (
    snapshot.callingSubscriptionStatus &&
    ACTIVE_CALLING_STATUSES.has(snapshot.callingSubscriptionStatus)
  ) {
    return true;
  }
  // Fallback: minutes already granted (e.g. fulfill raced ahead of status write).
  const minutes = await getCallMinuteBalance(userId);
  return minutes > 0;
}

export async function assertActiveCallingSubscription(
  userId: string,
): Promise<void> {
  const ok = await hasActiveCallingSubscription(userId);
  if (!ok) {
    throw new CallingSubscriptionRequiredError();
  }
}
