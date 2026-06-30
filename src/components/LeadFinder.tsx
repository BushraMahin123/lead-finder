"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import LeadResults from "@/components/LeadResults";
import type { LeadPerson, SearchFilters } from "@/types/lead";

export default function LeadFinder() {
  const [people, setPeople] = useState<LeadPerson[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters | null>(null);

  async function runSearch(nextFilters: SearchFilters) {
    setLoading(true);
    setError(null);
    setFilters(nextFilters);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextFilters),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      setPeople(data.people ?? []);
      setTotalEntries(data.totalEntries ?? 0);
    } catch (err) {
      setPeople([]);
      setTotalEntries(0);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function loadPage(page: number) {
    if (!filters) return;
    await runSearch({ ...filters, page });
  }

  const currentPage = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 25;
  const totalPages = Math.max(1, Math.ceil(totalEntries / perPage));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          B2B Lead Finder
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Find business leads by role, company, and location
        </h1>
        <p className="max-w-3xl text-base text-slate-600">
          Search Apollo&apos;s professional database for names, job titles,
          companies, verified emails, phone numbers, and LinkedIn profiles.
          Add your API key in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">.env.local</code> to get started.
        </p>
      </header>

      <SearchForm loading={loading} onSearch={runSearch} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <LeadResults
        people={people}
        totalEntries={totalEntries}
        loading={loading}
      />

      {people.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={loading || currentPage <= 1}
            onClick={() => loadPage(currentPage - 1)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={loading || currentPage >= totalPages}
            onClick={() => loadPage(currentPage + 1)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
