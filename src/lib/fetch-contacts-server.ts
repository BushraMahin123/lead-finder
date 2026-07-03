import { searchPeople } from "@/lib/ai-ark";
import { mergeEnrichmentsIntoPeople } from "@/lib/contact-enrichments";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import { MAX_SAVE_CONTACTS } from "@/lib/save-contacts-config";
import { getCachedSearch, setCachedSearch } from "@/lib/search-cache";
import type { LeadPerson, SearchFilters } from "@/types/lead";

async function fetchSearchPageServer(filters: SearchFilters) {
  const cached = await getCachedSearch(filters);
  if (cached) {
    return {
      people: await mergeEnrichmentsIntoPeople(cached.people),
      totalEntries: cached.totalEntries,
    };
  }

  const { people, totalEntries } = await searchPeople(filters);
  const response = await setCachedSearch(filters, {
    people,
    totalEntries,
    page: filters.page ?? 1,
    perPage: filters.perPage ?? SEARCH_RESULTS_PER_PAGE,
  });

  return {
    people: await mergeEnrichmentsIntoPeople(response.people),
    totalEntries: response.totalEntries,
  };
}

export async function fetchContactsUpToServer(
  filters: SearchFilters,
  targetCount: number,
): Promise<{ people: LeadPerson[]; totalEntries: number }> {
  const cap = Math.min(Math.max(1, targetCount), MAX_SAVE_CONTACTS);
  const batchSize = Math.min(100, cap);
  const baseFilters = { ...filters, page: 1 };

  let people: LeadPerson[] = [];
  let totalEntries = 0;
  let page = 1;

  while (people.length < cap) {
    const data = await fetchSearchPageServer({
      ...baseFilters,
      page,
      perPage: batchSize,
    });

    totalEntries = data.totalEntries;

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
  };
}
