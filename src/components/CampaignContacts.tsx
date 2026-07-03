"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LeadResults from "@/components/LeadResults";
import { ApiError } from "@/lib/fetch-json";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import type { CampaignWithContacts } from "@/types/campaign";
import type { LeadPerson } from "@/types/lead";

export default function CampaignContacts() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [campaign, setCampaign] = useState<CampaignWithContacts | null>(null);
  const [allPeople, setAllPeople] = useState<LeadPerson[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/campaigns/${campaignId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(String(data.error ?? "Failed to load table"));
        }

        const loaded = data.campaign as CampaignWithContacts;
        setCampaign(loaded);
        setAllPeople(loaded.contacts ?? []);
        setPage(1);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/login?next=/campaigns/${campaignId}`);
          setError("Your session expired. Redirecting to sign in…");
          return;
        }
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignId, router]);

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
            <Link
              href="/dashboard"
              className="mb-2 inline-block text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              ← Back to tables
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {campaign?.name ?? "Table"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {loading
                ? "Loading contacts…"
                : `${allPeople.length.toLocaleString()} saved contacts`}
              {campaign?.aiQuery && (
                <span className="text-slate-500">
                  {" "}
                  · From AI search: “{campaign.aiQuery}”
                </span>
              )}
            </p>
          </div>
          {campaign?.aiQuery && (
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

        <LeadResults
          people={visiblePeople}
          totalEntries={allPeople.length}
          loading={loading}
          showEmptyState={!loading && allPeople.length === 0}
          searchFilters={campaign?.searchFilters ?? null}
          campaignId={campaignId}
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
