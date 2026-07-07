import { getSupabaseAdmin } from "@/lib/supabase";
import { FREE_LIFETIME_TOKENS } from "@/lib/billing/plans";

export class InsufficientTokensError extends Error {
  balance: number;
  required: number;

  constructor(balance: number, required: number) {
    super(`Insufficient tokens. Need ${required}, have ${balance}.`);
    this.name = "InsufficientTokensError";
    this.balance = balance;
    this.required = required;
  }
}

interface BillingAccountRow {
  user_id: string;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  free_tokens_granted: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
}

export interface UserBillingSnapshot {
  balance: number;
  planId: string;
  freeTokensGranted: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

function getAdminOrThrow() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }
  return admin;
}

function parseInsufficientTokens(error: unknown): InsufficientTokensError | null {
  if (!error || typeof error !== "object") return null;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  const match = message.match(/^insufficient_tokens:([0-9.]+):([0-9.]+)$/);
  if (!match) return null;

  return new InsufficientTokensError(Number(match[1]), Number(match[2]));
}

async function applyTokenChange(input: {
  userId: string;
  amount: number;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  stripeEventId?: string;
}): Promise<{ balance: number; duplicate: boolean }> {
  const admin = getAdminOrThrow();

  const { data, error } = await admin.rpc("apply_token_change", {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_type: input.type,
    p_description: input.description ?? null,
    p_metadata: input.metadata ?? {},
    p_idempotency_key: input.idempotencyKey ?? null,
    p_stripe_event_id: input.stripeEventId ?? null,
  });

  if (error) {
    const insufficient = parseInsufficientTokens(error);
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

export async function ensureUserBillingAccount(userId: string): Promise<void> {
  const admin = getAdminOrThrow();
  const { error } = await admin.rpc("ensure_user_billing_account", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUserBillingSnapshot(
  userId: string,
): Promise<UserBillingSnapshot> {
  await ensureUserBillingAccount(userId);
  const admin = getAdminOrThrow();

  const [{ data: account, error: accountError }, { data: balanceRow, error: balanceError }] =
    await Promise.all([
      admin
        .from("user_billing_accounts")
        .select("*")
        .eq("user_id", userId)
        .single(),
      admin
        .from("user_token_balances")
        .select("balance")
        .eq("user_id", userId)
        .single(),
    ]);

  if (accountError) throw new Error(accountError.message);
  if (balanceError) throw new Error(balanceError.message);

  const row = account as BillingAccountRow;

  return {
    balance: Number(balanceRow?.balance ?? 0),
    planId: row.plan_id,
    freeTokensGranted: row.free_tokens_granted,
    subscriptionStatus: row.subscription_status,
    currentPeriodEnd: row.current_period_end,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
  };
}

export async function creditTokens(input: {
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

  const result = await applyTokenChange(input);
  return result.balance;
}

export async function debitTokens(input: {
  userId: string;
  amount: number;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<number> {
  if (input.amount <= 0) {
    const snapshot = await getUserBillingSnapshot(input.userId);
    return snapshot.balance;
  }

  const result = await applyTokenChange({
    ...input,
    amount: -input.amount,
  });
  return result.balance;
}

export async function assertSufficientTokens(
  userId: string,
  required: number,
): Promise<number> {
  const snapshot = await getUserBillingSnapshot(userId);
  if (snapshot.balance < required) {
    throw new InsufficientTokensError(snapshot.balance, required);
  }
  return snapshot.balance;
}

export async function updateBillingAccount(
  userId: string,
  patch: Partial<{
    planId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionStatus: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  }>,
): Promise<void> {
  const admin = getAdminOrThrow();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.planId !== undefined) update.plan_id = patch.planId;
  if (patch.stripeCustomerId !== undefined) {
    update.stripe_customer_id = patch.stripeCustomerId;
  }
  if (patch.stripeSubscriptionId !== undefined) {
    update.stripe_subscription_id = patch.stripeSubscriptionId;
  }
  if (patch.subscriptionStatus !== undefined) {
    update.subscription_status = patch.subscriptionStatus;
  }
  if (patch.currentPeriodStart !== undefined) {
    update.current_period_start = patch.currentPeriodStart;
  }
  if (patch.currentPeriodEnd !== undefined) {
    update.current_period_end = patch.currentPeriodEnd;
  }

  const { error } = await admin
    .from("user_billing_accounts")
    .update(update)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function findUserIdByStripeCustomerId(
  customerId: string,
): Promise<string | null> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from("user_billing_accounts")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.user_id ?? null;
}

export { FREE_LIFETIME_TOKENS };
