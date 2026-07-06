"use client";

import { useEffect, useState } from "react";
import { AISearchHeading, AISearchSubmitButton } from "@/components/AISearchIcon";
import { getPrimaryFilterTags } from "@/lib/applied-filter-tags";
import type { SearchFilters } from "@/types/lead";

interface AISearchSidebarProps {
  query: string;
  appliedFilters: Partial<SearchFilters> | null;
  loading?: boolean;
  onSearch: (query: string) => void | Promise<void>;
  onClear: () => void;
}

export default function AISearchSidebar({
  query,
  appliedFilters,
  loading = false,
  onSearch,
  onClear,
}: AISearchSidebarProps) {
  const [draft, setDraft] = useState(query);
  const tags = getPrimaryFilterTags(appliedFilters);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  async function submitQuery() {
    const nextQuery = draft.trim();
    if (!nextQuery || loading) return;
    await onSearch(nextQuery);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitQuery();
    }
  }

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-4">
      <div className="mb-3">
        <AISearchHeading />
      </div>

      <div className="relative">
        <textarea
          name="aiQuery"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={loading}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        />
        <div className="absolute bottom-3 right-3">
          <AISearchSubmitButton
            size="sm"
            disabled={loading || !draft.trim()}
            onClick={() => void submitQuery()}
            ariaLabel="Search again with AI"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.label}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
              tag.active
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-400"
            }`}
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
              <path
                d="M3 8.5l3 3 7-7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {tag.label}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="mt-4 text-sm font-medium text-slate-500 transition hover:text-slate-700"
      >
        Clear filters
      </button>
    </div>
  );
}
