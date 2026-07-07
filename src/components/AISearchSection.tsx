"use client";

import { useState } from "react";
import { AISearchHeading, AISearchSubmitButton } from "@/components/AISearchIcon";
import { AI_FILTER_TAGS } from "@/lib/filter-definitions";

interface AISearchSectionProps {
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  onSearch: (query: string) => void | Promise<void>;
}

export default function AISearchSection({
  loading = false,
  loadingMessage,
  error = null,
  onSearch,
}: AISearchSectionProps) {
  const [query, setQuery] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    await onSearch(trimmed);
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-6 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <AISearchHeading
            title="Describe your ideal lead, our AI builds the filters"
            size="md"
            layout="stacked"
          />
        </div>

        {loadingMessage && (
          <p className="mb-4 text-center text-sm text-indigo-600">{loadingMessage}</p>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rows={4}
            disabled={loading}
            placeholder="e.g. VP of Sales at SaaS companies in the US with 50-500 employees"
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-5 py-4 pr-16 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="absolute bottom-4 right-4">
            <AISearchSubmitButton
              type="submit"
              disabled={loading || !query.trim()}
              ariaLabel="Build filters from description"
            />
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {AI_FILTER_TAGS.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-slate-400" aria-hidden>
                <path
                  d="M3 8.5l3 3 7-7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
