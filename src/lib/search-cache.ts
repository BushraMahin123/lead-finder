import { createHash } from "crypto";
import {
  applyEnrichmentResults,
  mergeEnrichmentsIntoPeople,
} from "@/lib/contact-enrichments";
import { getSupabaseAdmin } from "@/lib/supabase";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import type { EnrichContactResult, SearchFilters, SearchResponse } from "@/types/lead";

const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const TABLE = "search_cache";

function sortList(values?: string[]): string[] {
  return [...(values ?? [])].map((v) => v.trim().toLowerCase()).sort();
}

function normalizeFilters(filters: SearchFilters) {
  return {
    searchMode: filters.searchMode ?? "linkedin",
    linkedInUrls: filters.linkedInUrls?.trim().toLowerCase() ?? "",
    companyName: filters.companyName?.trim().toLowerCase() ?? "",
    keywords: filters.keywords?.trim().toLowerCase() ?? "",
    jobTitle: filters.jobTitle?.trim().toLowerCase() ?? "",
    locations: sortList(filters.locations),
    companyLocations: sortList(filters.companyLocations),
    companyDomain: filters.companyDomain?.trim().toLowerCase() ?? "",
    industries: sortList(filters.industries),
    seniorities: sortList(filters.seniorities),
    departments: sortList(filters.departments),
    employeeSizes: sortList(filters.employeeSizes),
    employeeCountMin: filters.employeeCountMin ?? null,
    employeeCountMax: filters.employeeCountMax ?? null,
    experienceYearsMin: filters.experienceYearsMin ?? null,
    experienceYearsMax: filters.experienceYearsMax ?? null,
    annualRevenue: filters.annualRevenue?.trim().toLowerCase() ?? "",
    annualRevenueMin: filters.annualRevenueMin ?? null,
    annualRevenueMax: filters.annualRevenueMax ?? null,
    languages: sortList(filters.languages),
    companyTypes: sortList(filters.companyTypes),
    page: filters.page ?? 1,
    perPage: filters.perPage ?? SEARCH_RESULTS_PER_PAGE,
    enrichContacts: Boolean(filters.enrichContacts),
  };
}

function cacheKey(filters: SearchFilters): string {
  const normalized = normalizeFilters(filters);
  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

type CachePayload = Omit<SearchResponse, "cached" | "cachedAt" | "expiresAt">;

interface CacheRow {
  created_at: string;
  expires_at: string;
  payload: CachePayload;
}

export async function getCachedSearch(
  filters: SearchFilters,
): Promise<SearchResponse | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const key = cacheKey(filters);

  const { data, error } = await supabase
    .from(TABLE)
    .select("created_at, expires_at, payload")
    .eq("cache_key", key)
    .maybeSingle();

  if (error) {
    console.error("[cache] read failed:", error.message);
    return null;
  }

  if (!data) return null;

  const row = data as CacheRow;

  if (Date.now() > new Date(row.expires_at).getTime()) {
    await supabase.from(TABLE).delete().eq("cache_key", key);
    return null;
  }

  return {
    ...row.payload,
    cached: true,
    cachedAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function setCachedSearch(
  filters: SearchFilters,
  payload: CachePayload,
): Promise<SearchResponse> {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + CACHE_TTL_MS);
  const key = cacheKey(filters);

  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.from(TABLE).upsert(
      {
        cache_key: key,
        filters: normalizeFilters(filters),
        payload,
        created_at: createdAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "cache_key" },
    );

    if (error) {
      console.error("[cache] write failed:", error.message);
    }
  }

  return {
    ...payload,
    cached: false,
    cachedAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function updateCachedSearchEnrichments(
  filters: SearchFilters,
  results: EnrichContactResult[],
): Promise<boolean> {
  const successful = results.filter(
    (result) => result.email || result.phone_numbers?.length,
  );
  if (successful.length === 0) return false;

  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const key = cacheKey(filters);
  const { data, error } = await supabase
    .from(TABLE)
    .select("payload, expires_at")
    .eq("cache_key", key)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[cache] enrich patch read failed:", error.message);
    return false;
  }

  const row = data as { payload: CachePayload; expires_at: string };
  if (Date.now() > new Date(row.expires_at).getTime()) return false;

  const people = applyEnrichmentResults(row.payload.people, successful);
  const { error: updateError } = await supabase
    .from(TABLE)
    .update({
      payload: {
        ...row.payload,
        people,
      },
    })
    .eq("cache_key", key);

  if (updateError) {
    console.error("[cache] enrich patch write failed:", updateError.message);
    return false;
  }

  return true;
}
