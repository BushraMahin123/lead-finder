import { getPlanById } from "@/lib/billing/plans";
import {
  getAdminStripeContext,
  listAssignablePlans,
} from "@/lib/admin-billing";
import { creditTokens, debitTokens, getUserBillingSnapshot } from "@/lib/billing/tokens";
import { getSupabaseAdmin } from "@/lib/supabase";

function getAdminOrThrow() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }
  return admin;
}

export type AdminUserSummary = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  jobTitle: string;
  createdAt: string;
  isSuperAdmin: boolean;
  planId: string;
  planName: string;
  balance: number;
  campaignCount: number;
  contactCount: number;
};

export type AdminLedgerEntry = {
  id: string;
  userId: string;
  userEmail: string | null;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string | null;
  createdAt: string;
};

export type AdminCampaignSummary = {
  id: string;
  userId: string;
  userEmail: string | null;
  name: string;
  status: string;
  contactCount: number;
  aiQuery: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminStats = {
  totalUsers: number;
  totalCampaigns: number;
  totalContacts: number;
  totalTokenBalance: number;
  tokensCreditedToday: number;
  tokensDebitedToday: number;
};

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

  const [billingAccounts, balances, campaignCounts] = await Promise.all([
    admin
      .from("user_billing_accounts")
      .select("user_id, plan_id")
      .in("user_id", userIds),
    admin
      .from("user_token_balances")
      .select("user_id, balance")
      .in("user_id", userIds),
    getCampaignCountsByUser(userIds),
  ]);

  const planByUser = new Map(
    (billingAccounts.data ?? []).map((row) => [row.user_id, row.plan_id as string]),
  );
  const balanceByUser = new Map(
    (balances.data ?? []).map((row) => [row.user_id, Number(row.balance ?? 0)]),
  );

  const users = rows.map((row) => {
    const planId = planByUser.get(row.user_id) ?? "free";
    const counts = campaignCounts.get(row.user_id) ?? { campaigns: 0, contacts: 0 };

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
    };
  });

  return { users, total: count ?? users.length };
}

export async function getAdminUserDetail(userId: string) {
  const admin = getAdminOrThrow();

  const [{ data: profile, error: profileError }, billing, { data: campaigns, error: campaignsError }, { data: ledger, error: ledgerError }] =
    await Promise.all([
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
