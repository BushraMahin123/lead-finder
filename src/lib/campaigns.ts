import {
  applyEnrichmentResults,
  mergeEnrichmentsIntoPeople,
} from "@/lib/contact-enrichments";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  Campaign,
  CampaignStatus,
  CampaignWithContacts,
  ContactRowMeta,
  ContactStatus,
  RowColor,
} from "@/types/campaign";
import type { EnrichContactResult, LeadPerson, SearchFilters } from "@/types/lead";

const CAMPAIGNS_TABLE = "campaigns";
const CONTACTS_TABLE = "campaign_contacts";

interface CampaignRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  contact_count: number;
  search_total: number;
  ai_query: string | null;
  search_filters: SearchFilters;
  enrich_email: boolean;
  enrich_phone: boolean;
  created_at: string;
  updated_at: string;
}

interface ContactRow {
  id: string;
  campaign_id: string;
  person_id: string;
  person_data: LeadPerson;
  sort_order: number;
  created_at: string;
  contact_status?: string | null;
  contact_notes?: string | null;
  row_color?: string | null;
  is_done?: boolean | null;
  contact_meta_updated_at?: string | null;
}

function mapContactMeta(row: ContactRow): ContactRowMeta {
  return {
    personId: row.person_id,
    status: (row.contact_status ?? "not_contacted") as ContactStatus,
    notes: row.contact_notes ?? "",
    rowColor: (row.row_color as RowColor | null) ?? null,
    isDone: row.is_done ?? false,
    updatedAt: row.contact_meta_updated_at ?? row.created_at,
  };
}

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status as CampaignStatus,
    contactCount: row.contact_count,
    searchTotal: row.search_total,
    aiQuery: row.ai_query,
    searchFilters: row.search_filters ?? {},
    enrichEmail: row.enrich_email,
    enrichPhone: row.enrich_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getAdminOrThrow() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }
  return admin;
}

export async function listCampaignsForUser(userId: string): Promise<Campaign[]> {
  const admin = getAdminOrThrow();

  const { data, error } = await admin
    .from(CAMPAIGNS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data as CampaignRow[] | null) ?? []).map(mapCampaign);
}

export async function getCampaignForUser(
  campaignId: string,
  userId: string,
): Promise<Campaign | null> {
  const admin = getAdminOrThrow();

  const { data, error } = await admin
    .from(CAMPAIGNS_TABLE)
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapCampaign(data as CampaignRow);
}

export async function createCampaign(input: {
  userId: string;
  name: string;
  searchFilters: SearchFilters;
  searchTotal: number;
  aiQuery?: string | null;
  enrichEmail: boolean;
  enrichPhone: boolean;
}): Promise<Campaign> {
  const admin = getAdminOrThrow();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from(CAMPAIGNS_TABLE)
    .insert({
      user_id: input.userId,
      name: input.name.trim(),
      status: "draft",
      contact_count: 0,
      search_total: input.searchTotal,
      ai_query: input.aiQuery ?? null,
      search_filters: input.searchFilters,
      enrich_email: input.enrichEmail,
      enrich_phone: input.enrichPhone,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return mapCampaign(data as CampaignRow);
}

export async function insertCampaignContacts(
  campaignId: string,
  people: LeadPerson[],
  startOrder = 0,
): Promise<number> {
  if (people.length === 0) return 0;

  const admin = getAdminOrThrow();
  const rows = people.map((person, index) => ({
    campaign_id: campaignId,
    person_id: person.id,
    person_data: person,
    sort_order: startOrder + index,
  }));

  const chunkSize = 200;
  let inserted = 0;

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const { error } = await admin
      .from(CONTACTS_TABLE)
      .upsert(chunk, { onConflict: "campaign_id,person_id", ignoreDuplicates: true });

    if (error) throw new Error(error.message);
    inserted += chunk.length;
  }

  return inserted;
}

export async function updateCampaignContactCount(campaignId: string): Promise<number> {
  const admin = getAdminOrThrow();

  const { count, error: countError } = await admin
    .from(CONTACTS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if (countError) throw new Error(countError.message);

  const contactCount = count ?? 0;
  const now = new Date().toISOString();

  const { error } = await admin
    .from(CAMPAIGNS_TABLE)
    .update({ contact_count: contactCount, updated_at: now })
    .eq("id", campaignId);

  if (error) throw new Error(error.message);

  return contactCount;
}

export async function getCampaignWithContacts(
  campaignId: string,
  userId: string,
): Promise<CampaignWithContacts | null> {
  const campaign = await getCampaignForUser(campaignId, userId);
  if (!campaign) return null;

  const admin = getAdminOrThrow();

  const { data, error } = await admin
    .from(CONTACTS_TABLE)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data as ContactRow[] | null) ?? [];
  const contacts = rows.map((row) => row.person_data);
  const contactMeta: Record<string, ContactRowMeta> = {};

  for (const row of rows) {
    contactMeta[row.person_id] = mapContactMeta(row);
  }

  return {
    ...campaign,
    contacts: await mergeEnrichmentsIntoPeople(contacts),
    contactMeta,
  };
}

export async function updateCampaignContactMeta(input: {
  campaignId: string;
  personId: string;
  userId: string;
  status?: ContactStatus;
  notes?: string;
  rowColor?: RowColor | null;
  isDone?: boolean;
}): Promise<ContactRowMeta> {
  const campaign = await getCampaignForUser(input.campaignId, input.userId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const admin = getAdminOrThrow();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    contact_meta_updated_at: now,
  };

  if (input.status !== undefined) updates.contact_status = input.status;
  if (input.notes !== undefined) updates.contact_notes = input.notes;
  if (input.rowColor !== undefined) updates.row_color = input.rowColor;
  if (input.isDone !== undefined) updates.is_done = input.isDone;

  const { data, error } = await admin
    .from(CONTACTS_TABLE)
    .update(updates)
    .eq("campaign_id", input.campaignId)
    .eq("person_id", input.personId)
    .select(
      "person_id, contact_status, contact_notes, row_color, is_done, contact_meta_updated_at, created_at",
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Contact not found");

  await admin
    .from(CAMPAIGNS_TABLE)
    .update({ updated_at: now })
    .eq("id", input.campaignId);

  return mapContactMeta(data as ContactRow);
}

export async function updateCampaignContactEnrichments(
  campaignId: string,
  userId: string,
  results: EnrichContactResult[],
): Promise<boolean> {
  if (results.length === 0) return false;

  const campaign = await getCampaignForUser(campaignId, userId);
  if (!campaign) return false;

  const admin = getAdminOrThrow();
  const personIds = results.map((result) => result.id);

  const { data, error } = await admin
    .from(CONTACTS_TABLE)
    .select("person_id, person_data")
    .eq("campaign_id", campaignId)
    .in("person_id", personIds);

  if (error) throw new Error(error.message);

  const rows = (data as Pick<ContactRow, "person_id" | "person_data">[] | null) ?? [];
  if (rows.length === 0) return false;

  const updatedPeople = applyEnrichmentResults(
    rows.map((row) => row.person_data),
    results,
  );
  const byPersonId = new Map(
    updatedPeople.map((person) => [person.id, person]),
  );

  for (const row of rows) {
    const personData = byPersonId.get(row.person_id);
    if (!personData) continue;

    const { error: updateError } = await admin
      .from(CONTACTS_TABLE)
      .update({ person_data: personData })
      .eq("campaign_id", campaignId)
      .eq("person_id", row.person_id);

    if (updateError) throw new Error(updateError.message);
  }

  await admin
    .from(CAMPAIGNS_TABLE)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  return true;
}
