"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Campaign } from "@/types/campaign";

function displayNameFromEmail(email: string | null): string {
  if (!email) return "there";
  const local = email.split("@")[0] ?? email;
  return local.split(/[._-]/)[0] || local;
}

interface DashboardContentProps {
  userEmail: string | null;
}

export default function DashboardContent({ userEmail }: DashboardContentProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/campaigns");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(String(data.error ?? "Failed to load tables"));
        }
        setCampaigns((data.campaigns as Campaign[] | undefined) ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tables");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = campaigns.filter((campaign) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return campaign.name.toLowerCase().includes(query);
  });

  const firstName = displayNameFromEmail(userEmail);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50">
      <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
            Manage saved contact tables and continue prospecting from lead search.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/?view=search"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Create new table
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Tables</h2>
          <label className="relative">
            <span className="sr-only">Search tables</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tables"
              className="rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading tables…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">No tables yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Run a lead search and save contacts to create your first table.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
              >
                <p className="text-xs text-slate-500">
                  {campaign.contactCount.toLocaleString()} contacts
                </p>
                <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">
                  {campaign.name}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
