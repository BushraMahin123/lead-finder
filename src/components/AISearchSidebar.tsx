"use client";

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
  const tags = getPrimaryFilterTags(appliedFilters);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("aiQuery") ?? "").trim();
    if (!nextQuery || loading) return;
    await onSearch(nextQuery);
  }

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden>✨</span>
        <h3 className="text-sm font-semibold text-slate-900">Search with AI</h3>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <textarea
          name="aiQuery"
          defaultValue={query}
          rows={3}
          disabled={loading}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Search again with AI"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path
              d="M10 15V5M6 9l4-4 4 4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>

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
