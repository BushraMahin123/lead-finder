import {
  AI_ARK_LIST_MAX_ITEMS,
  AI_ARK_MAX_EXCLUDE_LISTS,
  AI_ARK_SEARCH_MAX_RESULTS,
  AI_ARK_SEARCH_PAGE_SIZE,
  AiArkPaginationLimitError,
  createPeopleIdList,
  searchPeople,
} from "@/lib/ai-ark";
import { mergeEnrichmentsIntoPeople } from "@/lib/contact-enrichments";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import { getCachedSearch, setCachedSearch } from "@/lib/search-cache";
import type { LeadPerson, SearchFilters } from "@/types/lead";

async function fetchSearchPageServer(
  filters: SearchFilters,
  options?: { excludePeopleListIds?: string[] },
) {
  const excludePeopleListIds = options?.excludePeopleListIds ?? [];
  const bypassCache = excludePeopleListIds.length > 0;

  if (!bypassCache) {
    const cached = await getCachedSearch(filters);
    if (cached) {
      return {
        people: await mergeEnrichmentsIntoPeople(cached.people),
        totalEntries: cached.totalEntries,
        providerPageCount: cached.providerPageCount ?? cached.people.length,
        providerPersonIds: cached.people.map((person) => person.id),
      };
    }
  }

  const { people, totalEntries, providerPageCount, providerPersonIds } =
    await searchPeople(filters, { excludePeopleListIds });

  if (!bypassCache) {
    const response = await setCachedSearch(filters, {
      people,
      totalEntries,
      providerPageCount,
      page: filters.page ?? 1,
      perPage: filters.perPage ?? SEARCH_RESULTS_PER_PAGE,
    });

    return {
      people: await mergeEnrichmentsIntoPeople(response.people),
      totalEntries: response.totalEntries,
      providerPageCount: response.providerPageCount ?? providerPageCount,
      providerPersonIds,
    };
  }

  return {
    people: await mergeEnrichmentsIntoPeople(people),
    totalEntries,
    providerPageCount,
    providerPersonIds,
  };
}

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetch up to targetCount contacts.
 * AI Ark rejects deep pagination past 10k results, so we fetch in waves and
 * exclude already-seen provider IDs via temporary lists.
 */
export async function fetchContactsUpToServer(
  filters: SearchFilters,
  targetCount: number,
  options?: {
    seedExcludePersonIds?: string[];
    excludePeopleListIds?: string[];
  },
): Promise<{ people: LeadPerson[]; totalEntries: number }> {
  const cap = Math.max(1, Math.floor(targetCount));
  const batchSize = Math.min(
    AI_ARK_SEARCH_PAGE_SIZE,
    Math.max(SEARCH_RESULTS_PER_PAGE, Math.min(cap, AI_ARK_SEARCH_PAGE_SIZE)),
  );
  const maxPagesPerWave = Math.max(
    1,
    Math.floor(AI_ARK_SEARCH_MAX_RESULTS / batchSize),
  );

  const people: LeadPerson[] = [];
  const seenIds = new Set<string>();
  const excludeListIds: string[] = [
    ...(options?.excludePeopleListIds ?? []).filter(Boolean),
  ].slice(0, AI_ARK_MAX_EXCLUDE_LISTS);
  let providerTotalEntries = 0;

  const seedIds = [
    ...new Set(
      (options?.seedExcludePersonIds ?? [])
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  for (const id of seedIds) seenIds.add(id);

  // Only build lists from DB IDs when the client did not pass reusable list IDs.
  if (excludeListIds.length === 0) {
    for (const chunk of chunkIds(seedIds, AI_ARK_LIST_MAX_ITEMS)) {
      if (excludeListIds.length >= AI_ARK_MAX_EXCLUDE_LISTS) break;
      excludeListIds.push(await createPeopleIdList(chunk));
    }
  }

  while (people.length < cap) {
    let page = 1;
    let waveMatched = 0;
    const waveProviderIds: string[] = [];

    while (people.length < cap && page <= maxPagesPerWave) {
      let data: {
        people: LeadPerson[];
        totalEntries: number;
        providerPageCount: number;
        providerPersonIds: string[];
      };

      try {
        data = await fetchSearchPageServer(
          {
            ...filters,
            page,
            perPage: batchSize,
          },
          { excludePeopleListIds: excludeListIds },
        );
      } catch (error) {
        if (error instanceof AiArkPaginationLimitError) {
          break;
        }
        throw error;
      }

      if (page === 1 && people.length === 0) {
        providerTotalEntries = data.totalEntries;
      }

      if (data.providerPageCount === 0) {
        return finalize(people, cap, providerTotalEntries);
      }

      for (const id of data.providerPersonIds) {
        if (id) waveProviderIds.push(id);
      }

      for (const person of data.people) {
        if (!person.id || seenIds.has(person.id)) continue;
        seenIds.add(person.id);
        people.push(person);
        waveMatched += 1;
        if (people.length >= cap) break;
      }

      if (people.length >= cap) break;

      if (data.providerPageCount < batchSize) {
        return finalize(people, cap, providerTotalEntries);
      }

      page += 1;
    }

    if (people.length >= cap) break;

    if (waveProviderIds.length === 0) break;

    const uniqueWaveIds = [...new Set(waveProviderIds)];
    const listChunks = chunkIds(uniqueWaveIds, AI_ARK_LIST_MAX_ITEMS);

    for (const chunk of listChunks) {
      if (excludeListIds.length >= AI_ARK_MAX_EXCLUDE_LISTS) {
        return finalize(people, cap, providerTotalEntries);
      }
      excludeListIds.push(await createPeopleIdList(chunk));
    }

    // If this wave added no matched contacts, further waves are unlikely to help.
    if (waveMatched === 0) break;
  }

  return finalize(people, cap, providerTotalEntries);
}

function finalize(
  people: LeadPerson[],
  cap: number,
  providerTotalEntries: number,
) {
  const trimmed = people.slice(0, cap);
  return {
    people: trimmed,
    totalEntries: Math.min(providerTotalEntries || trimmed.length, trimmed.length),
  };
}
