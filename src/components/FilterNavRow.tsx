"use client";

import type { ReactNode } from "react";
import type { FilterDefinition } from "@/lib/filter-definitions";

interface FilterNavRowProps {
  filter: FilterDefinition;
  active: boolean;
  hasValue: boolean;
  highlight?: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

export default function FilterNavRow({
  filter,
  active,
  hasValue,
  highlight = false,
  onToggle,
  children,
}: FilterNavRowProps) {
  return (
    <div className={`border-b border-slate-100 ${highlight && hasValue ? "filter-pulse" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
          active ? "bg-indigo-50/60" : ""
        }`}
      >
        {filter.icon}
        <span
          className={`flex-1 text-sm ${
            hasValue ? "font-medium text-slate-900" : "text-slate-700"
          }`}
        >
          {filter.label}
        </span>
        {hasValue && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500 ring-2 ring-indigo-200" />
        )}
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            active ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {active && children && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          {children}
        </div>
      )}
    </div>
  );
}
