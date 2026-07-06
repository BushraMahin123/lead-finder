"use client";

import { AISearchIconBadge } from "@/components/AISearchIcon";

interface AISearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch: (query: string) => void | Promise<void>;
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  warning?: string | null;
  compact?: boolean;
}

export default function AISearchBar({
  value,
  onChange,
  onSearch,
  loading = false,
  loadingMessage,
  error = null,
  warning = null,
  compact = false,
}: AISearchBarProps) {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("ai-query") as HTMLInputElement;
    const trimmed = input.value.trim();
    if (!trimmed || loading) return;
    await onSearch(trimmed);
  }

  return (
    <div className={compact ? "" : "border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-sm sm:px-6"}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
        <div className="ai-search-bar flex items-center gap-3 px-4 py-3">
          <AISearchIconBadge size="md" />
          <input
            id="ai-query"
            name="ai-query"
            type="text"
            value={value}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            disabled={loading}
            placeholder="Describe your ideal lead — e.g. VP Sales at SaaS companies in the US"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? "Building…" : "Search"}
          </button>
        </div>

        {loadingMessage && (
          <p className="mt-2 text-center text-xs font-medium text-indigo-600">
            {loadingMessage}
          </p>
        )}
        {error && <div className="alert-error mt-3">{error}</div>}
        {warning && !error && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warning}
          </div>
        )}
      </form>
    </div>
  );
}
