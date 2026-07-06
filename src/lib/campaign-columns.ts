import { hashPrompt } from "@/lib/ai-column-prompt";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  CampaignColumn,
  CampaignColumnValue,
  ColumnValueStatus,
} from "@/types/campaign";
import { getCampaignForUser } from "@/lib/campaigns";

const COLUMNS_TABLE = "campaign_columns";
const VALUES_TABLE = "campaign_column_values";

interface ColumnRow {
  id: string;
  campaign_id: string;
  name: string;
  prompt: string;
  sort_order: number;
  prompt_hash: string;
  created_at: string;
  updated_at: string;
}

interface ValueRow {
  column_id: string;
  person_id: string;
  value: string | null;
  status: string;
  error: string | null;
  prompt_hash: string;
  updated_at: string;
}

function getAdminOrThrow() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }
  return admin;
}

function mapColumn(row: ColumnRow): CampaignColumn {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    prompt: row.prompt,
    sortOrder: row.sort_order,
    promptHash: row.prompt_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapValue(row: ValueRow): CampaignColumnValue {
  return {
    columnId: row.column_id,
    personId: row.person_id,
    value: row.value,
    status: row.status as ColumnValueStatus,
    error: row.error,
    promptHash: row.prompt_hash,
    updatedAt: row.updated_at,
  };
}

export async function listCampaignColumns(
  campaignId: string,
  userId: string,
): Promise<CampaignColumn[]> {
  const campaign = await getCampaignForUser(campaignId, userId);
  if (!campaign) return [];

  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from(COLUMNS_TABLE)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data as ColumnRow[] | null) ?? []).map(mapColumn);
}

export async function createCampaignColumn(input: {
  campaignId: string;
  userId: string;
  name: string;
  prompt: string;
}): Promise<CampaignColumn> {
  const campaign = await getCampaignForUser(input.campaignId, input.userId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const admin = getAdminOrThrow();
  const now = new Date().toISOString();
  const prompt = input.prompt.trim();
  const promptHash = hashPrompt(prompt);

  const { count } = await admin
    .from(COLUMNS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", input.campaignId);

  const { data, error } = await admin
    .from(COLUMNS_TABLE)
    .insert({
      campaign_id: input.campaignId,
      name: input.name.trim(),
      prompt,
      sort_order: count ?? 0,
      prompt_hash: promptHash,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return mapColumn(data as ColumnRow);
}

export async function updateCampaignColumn(input: {
  campaignId: string;
  columnId: string;
  userId: string;
  name?: string;
  prompt?: string;
}): Promise<CampaignColumn> {
  const campaign = await getCampaignForUser(input.campaignId, input.userId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const admin = getAdminOrThrow();
  const updates: Partial<ColumnRow> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }

  if (input.prompt !== undefined) {
    const prompt = input.prompt.trim();
    updates.prompt = prompt;
    updates.prompt_hash = hashPrompt(prompt);
  }

  const { data, error } = await admin
    .from(COLUMNS_TABLE)
    .update(updates)
    .eq("id", input.columnId)
    .eq("campaign_id", input.campaignId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  if (input.prompt !== undefined) {
    await admin
      .from(VALUES_TABLE)
      .delete()
      .eq("column_id", input.columnId)
      .neq("prompt_hash", updates.prompt_hash!);
  }

  return mapColumn(data as ColumnRow);
}

export async function deleteCampaignColumn(
  campaignId: string,
  columnId: string,
  userId: string,
): Promise<void> {
  const campaign = await getCampaignForUser(campaignId, userId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const admin = getAdminOrThrow();
  const { error } = await admin
    .from(COLUMNS_TABLE)
    .delete()
    .eq("id", columnId)
    .eq("campaign_id", campaignId);

  if (error) throw new Error(error.message);
}

export async function getCampaignColumnValues(
  campaignId: string,
  userId: string,
): Promise<Record<string, Record<string, CampaignColumnValue>>> {
  const campaign = await getCampaignForUser(campaignId, userId);
  if (!campaign) return {};

  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from(VALUES_TABLE)
    .select("column_id, person_id, value, status, error, prompt_hash, updated_at")
    .eq("campaign_id", campaignId);

  if (error) throw new Error(error.message);

  const result: Record<string, Record<string, CampaignColumnValue>> = {};

  for (const row of (data as ValueRow[] | null) ?? []) {
    const value = mapValue(row);
    if (!result[value.personId]) {
      result[value.personId] = {};
    }
    result[value.personId][value.columnId] = value;
  }

  return result;
}

export async function upsertColumnValues(
  campaignId: string,
  columnId: string,
  promptHash: string,
  entries: Array<{
    personId: string;
    value: string | null;
    status: ColumnValueStatus;
    error?: string | null;
  }>,
): Promise<void> {
  if (entries.length === 0) return;

  const admin = getAdminOrThrow();
  const now = new Date().toISOString();

  const rows = entries.map((entry) => ({
    campaign_id: campaignId,
    column_id: columnId,
    person_id: entry.personId,
    value: entry.value,
    status: entry.status,
    error: entry.error ?? null,
    prompt_hash: promptHash,
    updated_at: now,
  }));

  const { error } = await admin
    .from(VALUES_TABLE)
    .upsert(rows, { onConflict: "campaign_id,column_id,person_id" });

  if (error) throw new Error(error.message);
}

export async function getCampaignColumn(
  campaignId: string,
  columnId: string,
  userId: string,
): Promise<CampaignColumn | null> {
  const columns = await listCampaignColumns(campaignId, userId);
  return columns.find((column) => column.id === columnId) ?? null;
}
