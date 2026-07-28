"use client";

import type { ReactNode } from "react";
import SubFilterTabs from "@/components/SubFilterTabs";
import type { CatalogSubFilter } from "@/lib/generated/filter-catalog";

interface CatalogSubFilterPanelProps {
  subFilters: CatalogSubFilter[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  renderSubFilter: (subFilter: CatalogSubFilter) => ReactNode;
}

export function CatalogSubFilterPanel({
  subFilters,
  activeTab,
  onTabChange,
  renderSubFilter,
}: CatalogSubFilterPanelProps) {
  const sorted = [...subFilters].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const current =
    sorted.find((subFilter) => subFilter.id === activeTab)?.id ??
    sorted[0]?.id ??
    "";

  return (
    <SubFilterTabs
      tabs={sorted.map((subFilter) => ({
        id: subFilter.id,
        label: subFilter.name,
      }))}
      activeTab={current}
      onTabChange={onTabChange}
    >
      {sorted
        .filter((subFilter) => subFilter.id === current)
        .map((subFilter) => (
          <div key={subFilter.id}>{renderSubFilter(subFilter)}</div>
        ))}
    </SubFilterTabs>
  );
}

export function rangeInputClassName() {
  return "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
}

export function textInputClassName() {
  return rangeInputClassName();
}

export function mergeKeywords(...parts: Array<string | undefined>): string | undefined {
  const merged = parts
    .flatMap((part) => (part ?? "").split(","))
    .map((part) => part.trim())
    .filter(Boolean);
  if (merged.length === 0) return undefined;
  return [...new Set(merged)].join(", ");
}

export function mergeListValues(
  custom: string,
  selected: string[],
): string | undefined {
  const values = [
    ...selected,
    ...custom.split(",").map((part) => part.trim()).filter(Boolean),
  ];
  if (values.length === 0) return undefined;
  return [...new Set(values)].join(", ");
}

export function FilterSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

export function matchesFilterSearch(label: string, query: string): boolean {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}
