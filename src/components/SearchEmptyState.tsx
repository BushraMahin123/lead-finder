"use client";

import Link from "next/link";
import { SEARCH_TEMPLATES } from "@/lib/search-templates";

type SearchEmptyStateProps = {
  onTemplateSelect?: (query: string) => void;
  variant?: "search" | "dashboard";
};

export default function SearchEmptyState({
  onTemplateSelect,
  variant = "search",
}: SearchEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center ${variant === "search" ? "flex-1 justify-center px-6 py-12" : "py-4"}`}>
      {variant === "search" && (
        <div className="card-flat max-w-lg border-dashed p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-indigo-600" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
            <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-900">
          Describe your ideal lead above
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Our AI will build filters on the left and show matching contacts here.
          Or start from a template below.
        </p>
      </div>
      )}

      <div className={`grid w-full max-w-2xl gap-3 sm:grid-cols-3 ${variant === "search" ? "mt-8" : "mt-4"}`}>
        {SEARCH_TEMPLATES.map((template) =>
          onTemplateSelect ? (
            <button
              key={template.id}
              type="button"
              onClick={() => onTemplateSelect(template.query)}
              className="card-flat p-4 text-left transition hover:border-indigo-200 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-slate-900">{template.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {template.description}
              </p>
            </button>
          ) : (
            <Link
              key={template.id}
              href={`/?view=search&q=${encodeURIComponent(template.query)}`}
              className="card-flat block p-4 text-left transition hover:border-indigo-200 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-slate-900">{template.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {template.description}
              </p>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
