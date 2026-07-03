"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/lib/fetch-json";
import {
  fetchSearchPage,
  getSearchQueryKey,
  SEARCH_RESULTS_PER_PAGE,
  type SearchPageData,
} from "@/lib/paginated-search-client";
import type { LeadPerson, SearchFilters } from "@/types/lead";

const MAX_CACHED_SEARCHES = 5;
const PREFETCH_AHEAD = 2;
const PREFETCH_BEHIND = 1;

interface UsePaginatedSearchOptions {
  onUnauthorized?: () => void;
}

export function usePaginatedSearch(options: UsePaginatedSearchOptions = {}) {
  const onUnauthorizedRef = useRef(options.onUnauthorized);
  onUnauthorizedRef.current = options.onUnauthorized;
  const [people, setPeople] = useState<LeadPerson[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const pageCacheRef = useRef<Map<string, Map<number, SearchPageData>>>(
    new Map(),
  );
  const prefetchingRef = useRef<Set<string>>(new Set());

  function trimSearchCaches() {
    const cache = pageCacheRef.current;
    while (cache.size > MAX_CACHED_SEARCHES) {
      const oldest = cache.keys().next().value;
      if (!oldest) break;
      cache.delete(oldest);
    }
  }

  function getPageCache(searchKey: string) {
    const cache = pageCacheRef.current;
    let pages = cache.get(searchKey);
    if (!pages) {
      pages = new Map();
      cache.set(searchKey, pages);
      trimSearchCaches();
    }
    return pages;
  }

  const applyPageData = useCallback(
    (data: SearchPageData, nextFilters: SearchFilters) => {
      setPeople(data.people);
      setTotalEntries(data.totalEntries);
      setFromCache(data.cached);
      setCachedAt(data.cachedAt);
      setFilters(nextFilters);
    },
    [],
  );

  const prefetchPages = useCallback(
    async (
      baseFilters: SearchFilters,
      searchKey: string,
      total: number,
    ) => {
      const perPage = baseFilters.perPage ?? SEARCH_RESULTS_PER_PAGE;
      const currentPage = baseFilters.page ?? 1;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      const pages = getPageCache(searchKey);

      const targets = new Set<number>();
      for (let offset = 1; offset <= PREFETCH_AHEAD; offset += 1) {
        targets.add(currentPage + offset);
      }
      for (let offset = 1; offset <= PREFETCH_BEHIND; offset += 1) {
        targets.add(currentPage - offset);
      }

      for (const page of targets) {
        if (page < 1 || page > totalPages || pages.has(page)) continue;

        const prefetchKey = `${searchKey}:${page}`;
        if (prefetchingRef.current.has(prefetchKey)) continue;
        prefetchingRef.current.add(prefetchKey);

        try {
          const data = await fetchSearchPage({ ...baseFilters, page });
          pages.set(page, data);
        } catch {
          // Prefetch failures are non-blocking.
        } finally {
          prefetchingRef.current.delete(prefetchKey);
        }
      }
    },
    [],
  );

  const runSearch = useCallback(
    async (
      nextFilters: SearchFilters,
      options?: { prefetch?: boolean },
    ) => {
      const page = nextFilters.page ?? 1;
      const searchKey = getSearchQueryKey(nextFilters);
      const pages = getPageCache(searchKey);
      const cachedPage = pages.get(page);

      setFilters(nextFilters);

      if (cachedPage) {
        applyPageData(cachedPage, nextFilters);
        setError(null);
        if (options?.prefetch !== false) {
          void prefetchPages(nextFilters, searchKey, cachedPage.totalEntries);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchSearchPage(nextFilters);
        pages.set(page, data);
        applyPageData(data, nextFilters);
        if (options?.prefetch !== false) {
          void prefetchPages(nextFilters, searchKey, data.totalEntries);
        }
      } catch (err) {
        setPeople([]);
        setTotalEntries(0);
        setFromCache(false);
        setCachedAt(null);

        if (err instanceof ApiError && err.status === 401) {
          onUnauthorizedRef.current?.();
          setError("Your session expired. Redirecting to sign in…");
          return;
        }

        if (err instanceof ApiError && err.status === 402) {
          setError(
            "Not enough tokens for this search. Visit Pricing to buy more or upgrade your plan.",
          );
          throw err;
        }

        setError(err instanceof Error ? err.message : "Something went wrong");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [applyPageData, prefetchPages],
  );

  const loadPage = useCallback(
    async (page: number, baseFilters?: SearchFilters | null) => {
      const activeFilters = baseFilters ?? filters;
      if (!activeFilters) return;
      await runSearch({ ...activeFilters, page });
    },
    [filters, runSearch],
  );

  const updatePeople = useCallback(
    (updated: LeadPerson[]) => {
      setPeople(updated);
      if (!filters) return;

      const searchKey = getSearchQueryKey(filters);
      const page = filters.page ?? 1;
      const pages = pageCacheRef.current.get(searchKey);
      const existing = pages?.get(page);
      if (pages && existing) {
        pages.set(page, { ...existing, people: updated });
      }
    },
    [filters],
  );

  const reset = useCallback(() => {
    pageCacheRef.current.clear();
    prefetchingRef.current.clear();
    setPeople([]);
    setTotalEntries(0);
    setLoading(false);
    setError(null);
    setFilters(null);
    setFromCache(false);
    setCachedAt(null);
  }, []);

  return {
    people,
    totalEntries,
    loading,
    error,
    filters,
    fromCache,
    cachedAt,
    setError,
    runSearch,
    loadPage,
    updatePeople,
    reset,
  };
}
