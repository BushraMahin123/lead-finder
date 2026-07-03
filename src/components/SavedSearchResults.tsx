"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LeadResults from "@/components/LeadResults";
import { ApiError } from "@/lib/fetch-json";
import {
  fetchContactsUpTo,
  SEARCH_RESULTS_PER_PAGE,
} from "@/lib/paginated-search-client";
import { clearSearchSession, loadSearchSession } from "@/lib/saved-search";
import type { LeadPerson, SearchFilters } from "@/types/lead";

export default function SavedSearchResults() {
  const router = useRouter();
  const [aiQuery, setAiQuery] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  const [allPeople, setAllPeople] = useState<LeadPerson[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [enrichEmail, setEnrichEmail] = useState(false);
  const [enrichPhone, setEnrichPhone] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadSearchSession();
    if (!saved) {
      router.replace("/?view=search");
      return;
    }

    setAiQuery(saved.aiQuery);
    setSearchFilters(saved.filters);
    setSearchTotal(saved.totalEntries);
    setEnrichEmail(saved.enrichEmail);
    setEnrichPhone(saved.enrichPhone);

    void loadSavedContacts(saved.filters, saved.contactCount);
    // Only load saved session on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadSavedContacts(filters: SearchFilters, contactCount: number) {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchContactsUpTo(filters, contactCount);
      setAllPeople(data.people);
      setFromCache(data.cached);
      setCachedAt(data.cachedAt);
      setPage(1);
    } catch (err) {
      setAllPeople([]);
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login?next=/results");
        setError("Your session expired. Redirecting to sign in…");
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    clearSearchSession();
    router.push("/?view=search");
  }

  function handlePeopleUpdate(updated: LeadPerson[]) {
    setAllPeople((current) => {
      const start = (page - 1) * SEARCH_RESULTS_PER_PAGE;
      const next = [...current];
      updated.forEach((person, index) => {
        next[start + index] = person;
      });
      return next;
    });
  }

  const visiblePeople = useMemo(() => {
    const start = (page - 1) * SEARCH_RESULTS_PER_PAGE;
    return allPeople.slice(start, start + SEARCH_RESULTS_PER_PAGE);
  }, [allPeople, page]);

  const totalPages = Math.max(
    1,
    Math.ceil(allPeople.length / SEARCH_RESULTS_PER_PAGE),
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={handleBack}
              className="mb-2 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              ← Back to search
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Saved contacts
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {aiQuery
                ? `From AI search: “${aiQuery}”`
                : "Saved search results with contact enrichment"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Showing {allPeople.length.toLocaleString()} of{" "}
              {searchTotal.toLocaleString()} matched contacts
              {(enrichEmail || enrichPhone) && (
                <span>
                  {" "}
                  · Planned enrichment:
                  {enrichEmail ? " email" : ""}
                  {enrichEmail && enrichPhone ? "," : ""}
                  {enrichPhone ? " phone" : ""}
                </span>
              )}
            </p>
          </div>
          {aiQuery && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              <span aria-hidden>✨</span>
              AI Search
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {fromCache && allPeople.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Results loaded from cache
            {cachedAt && (
              <span className="text-amber-700/80">
                {" "}
                — originally fetched{" "}
                {new Date(cachedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            .
          </div>
        )}

        <LeadResults
          people={visiblePeople}
          totalEntries={allPeople.length}
          loading={loading}
          showEmptyState={false}
          searchFilters={searchFilters}
          onPeopleUpdate={handlePeopleUpdate}
          enableEnrichment
        />

        {allPeople.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
