import { fetchJson } from "@/lib/fetch-json";
import { MAX_SAVE_CONTACTS } from "@/lib/save-contacts-config";
import type { LeadPerson, SearchFilters } from "@/types/lead";

export const SEARCH_RESULTS_PER_PAGE = 50;
export const AI_PREVIEW_PER_PAGE = 5;

export interface SearchPageData {
  people: LeadPerson[];
  totalEntries: number;
  cached: boolean;
  cachedAt: string | null;
  tokensDebited?: number;
}

export function getSearchQueryKey(filters: SearchFilters): string {
  const { page: _page, ...query } = filters;
  const sorted = Object.keys(query).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of sorted) {
    normalized[key] = query[key as keyof typeof query];
  }
  return JSON.stringify(normalized);
}

export async function fetchSearchPage(
  filters: SearchFilters,
): Promise<SearchPageData> {
  const { response, data } = await fetchJson("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters),
  });

  if (!response.ok) {
    throw new Error(String(data.error ?? "Search failed"));
  }

  return {
    people: (data.people as LeadPerson[] | undefined) ?? [],
    totalEntries: Number(data.totalEntries ?? 0),
    cached: Boolean(data.cached),
    cachedAt: (data.cachedAt as string | undefined) ?? null,
    tokensDebited: Number(data.tokensDebited ?? 0),
  };
}

export async function fetchContactsUpTo(
  filters: SearchFilters,
  targetCount: number,
): Promise<SearchPageData> {
  const cap = Math.min(Math.max(1, targetCount), MAX_SAVE_CONTACTS);
  const batchSize = Math.min(100, cap);
  const baseFilters = { ...filters, page: 1 };

  let people: LeadPerson[] = [];
  let totalEntries = 0;
  let cached = false;
  let cachedAt: string | null = null;
  let page = 1;

  while (people.length < cap) {
    const data = await fetchSearchPage({
      ...baseFilters,
      page,
      perPage: batchSize,
    });

    totalEntries = data.totalEntries;
    cached = cached || data.cached;
    cachedAt = cachedAt ?? data.cachedAt;

    if (data.people.length === 0) break;

    people = [...people, ...data.people];

    if (data.people.length < batchSize || people.length >= totalEntries) {
      break;
    }

    page += 1;
  }

  const trimmed = people.slice(0, cap);

  return {
    people: trimmed,
    totalEntries: Math.min(totalEntries, trimmed.length),
    cached,
    cachedAt,
  };
}
