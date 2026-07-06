"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardMockup from "@/components/DashboardMockup";
import { AISearchIconBadge } from "@/components/AISearchIcon";
import { useBillingBalance } from "@/hooks/useBillingBalance";
import { SEARCH_TEMPLATES } from "@/lib/search-templates";
import { displayNameFromEmail, greetingForTime } from "@/lib/user-display";

interface LandingHeroProps {
  userEmail?: string | null;
  onStart: () => void;
  onAISearch: (query: string) => void | Promise<void>;
}

export default function LandingHero({
  userEmail = null,
  onStart,
  onAISearch,
}: LandingHeroProps) {
  const { balance } = useBillingBalance();
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const firstName = displayNameFromEmail(userEmail);
  const greeting = greetingForTime();

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onAISearch(trimmed);
    } finally {
      setSubmitting(false);
    }
  }

  async function runTemplate(templateQuery: string) {
    if (submitting) return;
    setQuery(templateQuery);
    setSubmitting(true);
    try {
      await onAISearch(templateQuery);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-50/80 via-white/40 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">{greeting}</span>
              {balance && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-sm">
                  <span className="font-semibold text-slate-900">
                    {balance.balance.toLocaleString()}
                  </span>
                  tokens · {balance.planName}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]">
              {greeting}, {firstName}.
              <span className="mt-1 block text-[0.72em] font-medium text-slate-500">
                Who do you want to reach today?
              </span>
            </h1>

            <form onSubmit={handleSearchSubmit} className="mt-7">
              <label htmlFor="workspace-ai-query" className="sr-only">
                Describe your ideal lead
              </label>
              <div className="ai-search-bar flex items-center gap-3 px-4 py-3.5 shadow-md shadow-indigo-100/50">
                <AISearchIconBadge size="lg" />
                <input
                  id="workspace-ai-query"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  disabled={submitting}
                  placeholder="VP Sales at SaaS companies in the US, 51–200 employees"
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
                />
                <button
                  type="submit"
                  disabled={submitting || !query.trim()}
                  className="btn btn-primary shrink-0 px-5 py-2.5 disabled:opacity-50"
                >
                  {submitting ? "Searching…" : "Search"}
                </button>
              </div>
              <p className="mt-2.5 text-xs text-slate-500">
                AI builds your filters instantly.{" "}
                <button
                  type="button"
                  onClick={onStart}
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Or browse filters manually
                </button>
              </p>
            </form>

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Quick starts
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {SEARCH_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => void runTemplate(template.query)}
                    className="card-flat group p-3.5 text-left transition hover:border-indigo-200 hover:shadow-md disabled:opacity-60"
                  >
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                      {template.label}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-200/80 pt-6 text-sm">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 font-medium text-slate-700 transition hover:text-indigo-600"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
                  <path
                    d="M4 6h12v9H4V6zm2 2v2m4-2v2m4-2v5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                View saved tables
              </Link>
              <Link
                href="/pricing"
                className="text-slate-500 transition hover:text-slate-700"
              >
                Buy tokens
              </Link>
            </div>
          </div>

          <div className="relative hidden min-w-0 lg:block">
            <div className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" aria-hidden />
            <div className="relative rotate-1 transition hover:rotate-0">
              <DashboardMockup />
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">
              Preview of your search workspace
            </p>
          </div>
        </div>

        <div className="mt-10 lg:hidden">
          <DashboardMockup />
        </div>
      </div>
    </div>
  );
}
