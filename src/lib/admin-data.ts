import { CALLING_PACKS, getPlanById } from "@/lib/billing/plans";
import type {
  AdminCallLogSummary,
  AdminCallSummary,
  AdminCampaignSummary,
  AdminLedgerEntry,
  AdminStats,
  AdminTelnyxBillingSummary,
  AdminUserSummary,
} from "@/lib/admin-types";
import {
  getAdminStripeContext,
  listAssignablePlans,
} from "@/lib/admin-billing";
import { creditTokens, debitTokens, getUserBillingSnapshot } from "@/lib/billing/tokens";
import { getSupabaseAdmin } from "@/lib/supabase";
import { listUserPhoneNumbers } from "@/lib/user-phone-numbers";
import {
  getTelnyxAccountBalance,
  getTelnyxSampleNumberPricing,
  listTelnyxOwnedPhoneNumbers,
} from "@/lib/telnyx";

export type {
  AdminCallLogSummary,
  AdminCallSummary,
  AdminCampaignSummary,
  AdminLedgerEntry,
  AdminStats,
  AdminTelnyxBillingSummary,
  AdminUserSummary,
} from "@/lib/admin-types";

function getAdminOrThrow() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }
  return admin;
}

function emptyCallSummary(): AdminCallSummary {
  return {
    callCount: 0,
    connectedCallCount: 0,
    failedCallCount: 0,
    totalCallSeconds: 0,
    averageCallSeconds: 0,
    lastCallAt: null,
  };
}

function summarizeCallRows(
  rows: Array<{
    status?: string | null;
    duration_seconds?: number | null;
    created_at?: string | null;
  }>,
): AdminCallSummary {
  let callCount = 0;
  let connectedCallCount = 0;
  let failedCallCount = 0;
  let totalCallSeconds = 0;
  let lastCallAt: string | null = null;

  for (const row of rows) {
    callCount += 1;
    const duration = Number(row.duration_seconds ?? 0);
    if (Number.isFinite(duration) && duration > 0) {
      totalCallSeconds += duration;
    }
    if (duration > 0) connectedCallCount += 1;
    if (row.status === "failed") failedCallCount += 1;
    if (row.created_at && (!lastCallAt || row.created_at > lastCallAt)) {
      lastCallAt = row.created_at;
    }
  }

  return {
    callCount,
    connectedCallCount,
    failedCallCount,
    totalCallSeconds,
    averageCallSeconds:
      connectedCallCount > 0
        ? Math.round(totalCallSeconds / connectedCallCount)
        : 0,
    lastCallAt,
  };
}

async function getCallSummariesByUser(
  userIds: string[],
): Promise<Map<string, AdminCallSummary>> {
  const map = new Map<string, AdminCallSummary>();
  if (userIds.length === 0) return map;

  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from("call_logs")
    .select("user_id, status, duration_seconds, created_at")
    .in("user_id", userIds);

  if (error) throw new Error(error.message);

  const grouped = new Map<
    string,
    Array<{
      status?: string | null;
      duration_seconds?: number | null;
      created_at?: string | null;
    }>
  >();

  for (const row of data ?? []) {
    const userId = row.user_id as string;
    const list = grouped.get(userId) ?? [];
    list.push(row);
    grouped.set(userId, list);
  }

  for (const userId of userIds) {
    map.set(userId, summarizeCallRows(grouped.get(userId) ?? []));
  }

  return map;
}

async function getUserCallActivity(userId: string): Promise<{
  summary: AdminCallSummary;
  recentCalls: AdminCallLogSummary[];
}> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from("call_logs")
    .select(
      "id, to_number, from_number, status, disposition, duration_seconds, person_name, created_at, ended_at, recording_path, transcription_status, transcript",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return {
    summary: summarizeCallRows(rows),
    recentCalls: rows.slice(0, 25).map((row) => ({
      id: row.id as string,
      toNumber: row.to_number as string,
      fromNumber: (row.from_number as string | null) ?? null,
      status: row.status as string,
      disposition: (row.disposition as string | null) ?? null,
      durationSeconds:
        row.duration_seconds == null ? null : Number(row.duration_seconds),
      personName: (row.person_name as string | null) ?? null,
      createdAt: row.created_at as string,
      endedAt: (row.ended_at as string | null) ?? null,
      hasRecording: Boolean(row.recording_path),
      transcriptionStatus: (row.transcription_status as string | null) ?? null,
      transcript: (row.transcript as string | null) ?? null,
    })),
  };
}

type ProfileRow = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  job_title: string;
  created_at: string;
  is_super_admin: boolean;
};

async function countTable(table: string): Promise<number> {
  const admin = getAdminOrThrow();
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function sumTokenBalances(): Promise<number> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin.from("user_token_balances").select("balance");

  if (error) throw new Error(error.message);

  return (data ?? []).reduce(
    (total, row) => total + Number(row.balance ?? 0),
    0,
  );
}

async function sumLedgerSince(sinceIso: string, positive: boolean): Promise<number> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from("token_ledger")
    .select("amount")
    .gte("created_at", sinceIso);

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((total, row) => {
    const amount = Number(row.amount ?? 0);
    if (positive && amount > 0) return total + amount;
    if (!positive && amount < 0) return total + Math.abs(amount);
    return total;
  }, 0);
}

export async function getAdminStats(): Promise<AdminStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [totalUsers, totalCampaigns, totalContacts, totalTokenBalance, tokensCreditedToday, tokensDebitedToday] =
    await Promise.all([
      countTable("user_profiles"),
      countTable("campaigns"),
      countTable("campaign_contacts"),
      sumTokenBalances(),
      sumLedgerSince(startOfDay.toISOString(), true),
      sumLedgerSince(startOfDay.toISOString(), false),
    ]);

  return {
    totalUsers,
    totalCampaigns,
    totalContacts,
    totalTokenBalance,
    tokensCreditedToday,
    tokensDebitedToday,
  };
}

async function getCampaignCountsByUser(
  userIds: string[],
): Promise<Map<string, { campaigns: number; contacts: number }>> {
  const counts = new Map<string, { campaigns: number; contacts: number }>();
  if (userIds.length === 0) return counts;

  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from("campaigns")
    .select("user_id, contact_count")
    .in("user_id", userIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const current = counts.get(row.user_id) ?? { campaigns: 0, contacts: 0 };
    current.campaigns += 1;
    current.contacts += Number(row.contact_count ?? 0);
    counts.set(row.user_id, current);
  }

  return counts;
}

export async function listAdminUsers(input: {
  query?: string;
  page?: number;
  perPage?: number;
}): Promise<{ users: AdminUserSummary[]; total: number }> {
  const admin = getAdminOrThrow();
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(50, Math.max(1, input.perPage ?? 20));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const query = input.query?.trim();

  let profileQuery = admin
    .from("user_profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (query) {
    const pattern = `%${query}%`;
    profileQuery = profileQuery.or(
      [
        `email.ilike.${pattern}`,
        `first_name.ilike.${pattern}`,
        `last_name.ilike.${pattern}`,
        `company_name.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data: profiles, count, error } = await profileQuery;
  if (error) throw new Error(error.message);

  const rows = (profiles ?? []) as ProfileRow[];
  const userIds = rows.map((row) => row.user_id);

  const [billingAccounts, balances, campaignCounts, phoneRows, callSummaries] =
    await Promise.all([
    admin
      .from("user_billing_accounts")
      .select("user_id, plan_id")
      .in("user_id", userIds),
    admin
      .from("user_token_balances")
      .select("user_id, balance")
      .in("user_id", userIds),
    getCampaignCountsByUser(userIds),
    userIds.length === 0
      ? Promise.resolve({ data: [] as Array<{
          user_id: string;
          phone_number: string;
          is_default: boolean;
          status: string;
        }>, error: null })
      : admin
          .from("user_phone_numbers")
          .select("user_id, phone_number, is_default, status")
          .in("user_id", userIds)
          .neq("status", "released"),
    getCallSummariesByUser(userIds),
  ]);

  if (phoneRows.error) throw new Error(phoneRows.error.message);

  const planByUser = new Map(
    (billingAccounts.data ?? []).map((row) => [row.user_id, row.plan_id as string]),
  );
  const balanceByUser = new Map(
    (balances.data ?? []).map((row) => [row.user_id, Number(row.balance ?? 0)]),
  );

  const phonesByUser = new Map<
    string,
    { defaultNumber: string | null; count: number }
  >();
  for (const row of phoneRows.data ?? []) {
    const current = phonesByUser.get(row.user_id) ?? {
      defaultNumber: null,
      count: 0,
    };
    current.count += 1;
    if (row.is_default && row.status === "active") {
      current.defaultNumber = row.phone_number;
    } else if (!current.defaultNumber && row.status === "active") {
      current.defaultNumber = row.phone_number;
    }
    phonesByUser.set(row.user_id, current);
  }

  const users = rows.map((row) => {
    const planId = planByUser.get(row.user_id) ?? "free";
    const counts = campaignCounts.get(row.user_id) ?? { campaigns: 0, contacts: 0 };
    const phones = phonesByUser.get(row.user_id);
    const calls = callSummaries.get(row.user_id) ?? emptyCallSummary();

    return {
      userId: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      companyName: row.company_name,
      jobTitle: row.job_title,
      createdAt: row.created_at,
      isSuperAdmin: Boolean(row.is_super_admin),
      planId,
      planName: getPlanById(planId)?.name ?? planId,
      balance: balanceByUser.get(row.user_id) ?? 0,
      campaignCount: counts.campaigns,
      contactCount: counts.contacts,
      phoneNumber: phones?.defaultNumber ?? null,
      phoneNumberCount: phones?.count ?? 0,
      callCount: calls.callCount,
      connectedCallCount: calls.connectedCallCount,
      totalCallSeconds: calls.totalCallSeconds,
    };
  });

  return { users, total: count ?? users.length };
}

export async function getAdminUserDetail(userId: string) {
  const admin = getAdminOrThrow();

  const [
    { data: profile, error: profileError },
    billing,
    { data: campaigns, error: campaignsError },
    { data: ledger, error: ledgerError },
    phoneNumbers,
    callActivity,
  ] = await Promise.all([
      admin.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
      getUserBillingSnapshot(userId),
      admin
        .from("campaigns")
        .select("id, name, status, contact_count, ai_query, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50),
      admin
        .from("token_ledger")
        .select("id, amount, balance_after, type, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      listUserPhoneNumbers(userId),
      getUserCallActivity(userId),
    ]);

  if (profileError) throw new Error(profileError.message);
  if (!profile) return null;
  if (campaignsError) throw new Error(campaignsError.message);
  if (ledgerError) throw new Error(ledgerError.message);

  const stripe = await getAdminStripeContext(userId);

  return {
    profile: {
      userId: profile.user_id as string,
      email: profile.email as string,
      firstName: profile.first_name as string,
      lastName: profile.last_name as string,
      companyName: profile.company_name as string,
      jobTitle: profile.job_title as string,
      companySize: profile.company_size as string,
      industry: profile.industry as string,
      useCase: profile.use_case as string,
      createdAt: profile.created_at as string,
      isSuperAdmin: Boolean(profile.is_super_admin),
    },
    billing,
    stripe,
    plans: listAssignablePlans(),
    phoneNumbers,
    callSummary: callActivity.summary,
    recentCalls: callActivity.recentCalls,
    campaigns: (campaigns ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      status: row.status as string,
      contactCount: Number(row.contact_count ?? 0),
      aiQuery: (row.ai_query as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    })),
    ledger: (ledger ?? []).map((row) => ({
      id: row.id as string,
      amount: Number(row.amount ?? 0),
      balanceAfter: Number(row.balance_after ?? 0),
      type: row.type as string,
      description: (row.description as string | null) ?? null,
      createdAt: row.created_at as string,
    })),
  };
}

export async function listRecentLedger(limit = 25): Promise<AdminLedgerEntry[]> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from("token_ledger")
    .select("id, user_id, amount, balance_after, type, description, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const userIds = [...new Set((data ?? []).map((row) => row.user_id as string))];
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, email")
    .in("user_id", userIds);

  const emailByUser = new Map(
    (profiles ?? []).map((row) => [row.user_id as string, row.email as string]),
  );

  return (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    userEmail: emailByUser.get(row.user_id as string) ?? null,
    amount: Number(row.amount ?? 0),
    balanceAfter: Number(row.balance_after ?? 0),
    type: row.type as string,
    description: (row.description as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export async function listAdminCampaigns(input: {
  page?: number;
  perPage?: number;
}): Promise<{ campaigns: AdminCampaignSummary[]; total: number }> {
  const admin = getAdminOrThrow();
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(50, Math.max(1, input.perPage ?? 20));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count, error } = await admin
    .from("campaigns")
    .select("id, user_id, name, status, contact_count, ai_query, created_at, updated_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const userIds = [...new Set((data ?? []).map((row) => row.user_id as string))];
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("user_id, email")
    .in("user_id", userIds);

  const emailByUser = new Map(
    (profiles ?? []).map((row) => [row.user_id as string, row.email as string]),
  );

  const campaigns = (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    userEmail: emailByUser.get(row.user_id as string) ?? null,
    name: row.name as string,
    status: row.status as string,
    contactCount: Number(row.contact_count ?? 0),
    aiQuery: (row.ai_query as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));

  return { campaigns, total: count ?? campaigns.length };
}

export async function grantTokensAsAdmin(input: {
  targetUserId: string;
  adminUserId: string;
  amount: number;
  description?: string;
}): Promise<{ balance: number }> {
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    throw new Error("Amount must be a non-zero number");
  }

  const metadata = {
    grantedBy: input.adminUserId,
    grantedAt: new Date().toISOString(),
  };
  const idempotencyKey = `admin_grant:${input.targetUserId}:${Date.now()}:${input.adminUserId}`;

  if (input.amount > 0) {
    const balance = await creditTokens({
      userId: input.targetUserId,
      amount: input.amount,
      type: "admin_grant",
      description: input.description ?? "Manual token grant by admin",
      metadata,
      idempotencyKey,
    });
    return { balance };
  }

  const balance = await debitTokens({
    userId: input.targetUserId,
    amount: Math.abs(input.amount),
    type: "admin_revoke",
    description: input.description ?? "Manual token adjustment by admin",
    metadata,
    idempotencyKey,
  });
  return { balance };
}

async function getPlatformPhoneInventory(): Promise<
  AdminTelnyxBillingSummary["inventory"]
> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from("user_phone_numbers")
    .select("status, monthly_cost, upfront_cost")
    .neq("status", "released");

  if (error) throw new Error(error.message);

  const rows = (data as Array<{
    status: string;
    monthly_cost: number | string | null;
    upfront_cost: number | string | null;
  }> | null) ?? [];

  let activeNumbers = 0;
  let pendingNumbers = 0;
  let totalMonthlyCost = 0;
  let totalUpfrontCost = 0;
  let numbersMissingCost = 0;

  for (const row of rows) {
    if (row.status === "active") activeNumbers += 1;
    if (row.status === "pending") pendingNumbers += 1;

    const monthly =
      row.monthly_cost == null ? null : Number(row.monthly_cost);
    const upfront =
      row.upfront_cost == null ? null : Number(row.upfront_cost);

    if (monthly == null || !Number.isFinite(monthly)) {
      numbersMissingCost += 1;
    } else {
      totalMonthlyCost += monthly;
    }
    if (upfront != null && Number.isFinite(upfront)) {
      totalUpfrontCost += upfront;
    }
  }

  return {
    activeNumbers,
    pendingNumbers,
    totalMonthlyCost,
    totalUpfrontCost,
    numbersMissingCost,
  };
}

export async function getAdminTelnyxBillingSummary(): Promise<AdminTelnyxBillingSummary> {
  const pack = CALLING_PACKS[0];
  const customerPricing = {
    callingMonthlyUsd: pack?.price ?? 35,
    numberFeeOneTimeUsd: pack?.numberFeeOneTime ?? 4,
    firstPaymentUsd: pack?.firstPaymentTotal ?? 38.99,
  };

  const inventory = await getPlatformPhoneInventory().catch(() => ({
    activeNumbers: 0,
    pendingNumbers: 0,
    totalMonthlyCost: 0,
    totalUpfrontCost: 0,
    numbersMissingCost: 0,
  }));

  if (!process.env.TELNYX_API_KEY?.trim()) {
    return {
      configured: false,
      balance: null,
      ownedOnTelnyx: null,
      sampleNumberPricing: null,
      inventory,
      customerPricing,
      errors: ["TELNYX_API_KEY is not configured"],
    };
  }

  const errors: string[] = [];
  let balance: AdminTelnyxBillingSummary["balance"] = null;
  let ownedOnTelnyx: AdminTelnyxBillingSummary["ownedOnTelnyx"] = null;
  let sampleNumberPricing: AdminTelnyxBillingSummary["sampleNumberPricing"] =
    null;

  const [balanceResult, ownedResult, pricingResult] = await Promise.allSettled([
    getTelnyxAccountBalance(),
    listTelnyxOwnedPhoneNumbers(50),
    getTelnyxSampleNumberPricing(8),
  ]);

  if (balanceResult.status === "fulfilled") {
    balance = balanceResult.value;
  } else {
    errors.push(
      balanceResult.reason instanceof Error
        ? `Balance: ${balanceResult.reason.message}`
        : "Balance: failed to load",
    );
  }

  if (ownedResult.status === "fulfilled") {
    ownedOnTelnyx = {
      totalCount: ownedResult.value.totalCount,
      preview: ownedResult.value.numbers.slice(0, 12).map((row) => ({
        id: row.id,
        phoneNumber: row.phoneNumber,
        status: row.status,
      })),
    };
  } else {
    errors.push(
      ownedResult.reason instanceof Error
        ? `Owned numbers: ${ownedResult.reason.message}`
        : "Owned numbers: failed to load",
    );
  }

  if (pricingResult.status === "fulfilled") {
    sampleNumberPricing = pricingResult.value;
  } else {
    errors.push(
      pricingResult.reason instanceof Error
        ? `Number pricing sample: ${pricingResult.reason.message}`
        : "Number pricing sample: failed to load",
    );
  }

  return {
    configured: true,
    balance,
    ownedOnTelnyx,
    sampleNumberPricing,
    inventory,
    customerPricing,
    errors,
  };
}
