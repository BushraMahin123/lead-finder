import {
  enrichEmailContact,
  enrichPhoneContact,
} from "@/lib/airscale";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { EnrichContactResult, EnrichType, LeadPerson } from "@/types/lead";

const TABLE = "contact_enrichments";
let tableMissingLogged = false;

interface EnrichmentRow {
  person_id: string;
  linkedin_url: string | null;
  email: string | null;
  email_status: string | null;
  phone_numbers: LeadPerson["phone_numbers"] | null;
  enriched_at: string;
  updated_at: string;
}

function normalizeLinkedInUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "");
  }
}

function rowToResult(row: EnrichmentRow, personId?: string): EnrichContactResult {
  const phones = row.phone_numbers ?? [];
  return {
    id: personId ?? row.person_id,
    email: row.email ?? undefined,
    email_status: row.email_status ?? undefined,
    phone_numbers: phones.length > 0 ? phones : undefined,
    fromStorage: true,
  };
}

function hasStoredEmail(result: EnrichContactResult): boolean {
  return Boolean(result.email);
}

function hasStoredPhone(result: EnrichContactResult): boolean {
  return Boolean(result.phone_numbers?.length);
}

function hasStoredContacts(result: EnrichContactResult): boolean {
  return hasStoredEmail(result) || hasStoredPhone(result);
}

function cachedResultForType(
  cached: EnrichContactResult,
  type: EnrichType,
): EnrichContactResult | null {
  if (type === "email" && hasStoredEmail(cached)) {
    return {
      id: cached.id,
      email: cached.email,
      email_status: cached.email_status,
      fromStorage: true,
    };
  }

  if (type === "phone" && hasStoredPhone(cached)) {
    return {
      id: cached.id,
      phone_numbers: cached.phone_numbers,
      fromStorage: true,
    };
  }

  return null;
}

function resultHasType(result: EnrichContactResult, type: EnrichType): boolean {
  return type === "email" ? hasStoredEmail(result) : hasStoredPhone(result);
}

function logTableMissing(error: { code?: string; message?: string }) {
  if (tableMissingLogged) return;
  if (error.code === "PGRST205" || error.message?.includes("contact_enrichments")) {
    tableMissingLogged = true;
    console.error(
      "[contact-enrichments] table missing — run supabase/contact_enrichments.sql in Supabase SQL Editor",
    );
  }
}

export async function getEnrichmentsForPeople(
  people: LeadPerson[],
): Promise<Map<string, EnrichContactResult>> {
  const map = new Map<string, EnrichContactResult>();
  if (people.length === 0) return map;

  const supabase = getSupabaseAdmin();
  if (!supabase) return map;

  const personIds = people.map((person) => person.id);
  const linkedinUrls = [
    ...new Set(
      people
        .map((person) => person.linkedin_url)
        .filter((url): url is string => Boolean(url)),
    ),
  ];

  const { data: byId, error: idError } = await supabase
    .from(TABLE)
    .select("person_id, linkedin_url, email, email_status, phone_numbers, enriched_at, updated_at")
    .in("person_id", personIds);

  if (idError) {
    logTableMissing(idError);
    if (idError.code !== "PGRST205") {
      console.error("[contact-enrichments] read by id failed:", idError.message);
    }
  }

  const rowsById = new Map<string, EnrichmentRow>();
  for (const row of (byId ?? []) as EnrichmentRow[]) {
    rowsById.set(row.person_id, row);
  }

  let rowsByLinkedin = new Map<string, EnrichmentRow>();
  if (linkedinUrls.length > 0 && !idError) {
    const { data: byLinkedin, error: linkedinError } = await supabase
      .from(TABLE)
      .select("person_id, linkedin_url, email, email_status, phone_numbers, enriched_at, updated_at")
      .in("linkedin_url", linkedinUrls);

    if (linkedinError) {
      logTableMissing(linkedinError);
    } else {
      rowsByLinkedin = new Map(
        ((byLinkedin ?? []) as EnrichmentRow[])
          .filter((row) => row.linkedin_url)
          .map((row) => [normalizeLinkedInUrl(row.linkedin_url!), row]),
      );
    }
  }

  for (const person of people) {
    const byPersonId = rowsById.get(person.id);
    if (byPersonId) {
      const result = rowToResult(byPersonId, person.id);
      if (hasStoredContacts(result)) {
        map.set(person.id, result);
        continue;
      }
    }

    if (person.linkedin_url) {
      const byUrl = rowsByLinkedin.get(normalizeLinkedInUrl(person.linkedin_url));
      if (byUrl) {
        const result = rowToResult(byUrl, person.id);
        if (hasStoredContacts(result)) {
          map.set(person.id, result);
        }
      }
    }
  }

  return map;
}

async function getExistingRow(person: LeadPerson): Promise<EnrichmentRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("person_id, linkedin_url, email, email_status, phone_numbers, enriched_at, updated_at")
    .eq("person_id", person.id)
    .maybeSingle();

  if (error) {
    logTableMissing(error);
    return null;
  }

  return (data as EnrichmentRow | null) ?? null;
}

export async function saveEnrichment(
  person: LeadPerson,
  result: EnrichContactResult,
): Promise<boolean> {
  if (!hasStoredContacts(result)) return false;

  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const existing = await getExistingRow(person);
  const existingPhones = existing?.phone_numbers ?? [];
  const mergedPhones =
    result.phone_numbers && result.phone_numbers.length > 0
      ? result.phone_numbers
      : existingPhones;

  const now = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert(
    {
      person_id: person.id,
      linkedin_url: person.linkedin_url ?? existing?.linkedin_url ?? null,
      email: result.email ?? existing?.email ?? null,
      email_status: result.email_status ?? existing?.email_status ?? null,
      phone_numbers: mergedPhones,
      enriched_at: existing?.enriched_at ?? now,
      updated_at: now,
    },
    { onConflict: "person_id" },
  );

  if (error) {
    logTableMissing(error);
    if (error.code !== "PGRST205") {
      console.error("[contact-enrichments] write failed:", error.message);
    }
    return false;
  }

  return true;
}

export function mergeEnrichmentIntoPerson(
  person: LeadPerson,
  enrichment?: EnrichContactResult,
): LeadPerson {
  if (!enrichment || !hasStoredContacts(enrichment)) return person;

  const phones =
    enrichment.phone_numbers && enrichment.phone_numbers.length > 0
      ? enrichment.phone_numbers
      : person.phone_numbers;

  return {
    ...person,
    email: enrichment.email ?? person.email,
    email_status: enrichment.email_status ?? person.email_status,
    phone_numbers: phones,
  };
}

export async function mergeEnrichmentsIntoPeople(
  people: LeadPerson[],
): Promise<LeadPerson[]> {
  if (people.length === 0) return people;

  const stored = await getEnrichmentsForPeople(people);
  if (stored.size === 0) return people;

  return people.map((person) =>
    mergeEnrichmentIntoPerson(person, stored.get(person.id)),
  );
}

export async function enrichContactsWithPersistence(
  people: LeadPerson[],
  type: EnrichType,
): Promise<EnrichContactResult[]> {
  const stored = await getEnrichmentsForPeople(people);
  const results: EnrichContactResult[] = [];

  for (const person of people) {
    const cached = stored.get(person.id);
    const cachedForType = cached ? cachedResultForType(cached, type) : null;
    if (cachedForType) {
      results.push(cachedForType);
      continue;
    }

    const result =
      type === "email"
        ? await enrichEmailContact(person)
        : await enrichPhoneContact(person);

    if (resultHasType(result, type)) {
      await saveEnrichment(person, result);
    }
    results.push(result);
  }

  return results;
}

export function applyEnrichmentResults(
  people: LeadPerson[],
  results: EnrichContactResult[],
): LeadPerson[] {
  const byId = new Map(results.map((result) => [result.id, result]));
  return people.map((person) =>
    mergeEnrichmentIntoPerson(person, byId.get(person.id)),
  );
}
