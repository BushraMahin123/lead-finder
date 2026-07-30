"use client";

import { useMemo, useState } from "react";
import type { FilterOption } from "@/lib/filter-options";
import {
  FilterSearchInput,
  matchesFilterSearch,
} from "@/components/filter-panel-utils";

interface FilterSectionProps {
  title: string;
  description?: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  defaultOpen?: boolean;
  maxHeight?: string;
  embedded?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

const SEARCHABLE_OPTION_THRESHOLD = 20;

export default function FilterSection({
  title,
  description,
  options,
  selected,
  onChange,
  defaultOpen = true,
  maxHeight = "max-h-48",
  embedded = false,
  searchable,
  searchPlaceholder,
}: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const showSearch = searchable ?? options.length >= SEARCHABLE_OPTION_THRESHOLD;

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  }

  const visibleOptions = useMemo(() => {
    const query = searchQuery.trim();
    const selectedSet = new Set(selected);

    const base = !query
      ? [...options]
      : options.filter(
          (option) =>
            selectedSet.has(option.value) ||
            matchesFilterSearch(option.label, query),
        );

    if (selectedSet.size === 0) return base;

    return base.sort((a, b) => {
      const aSelected = selectedSet.has(a.value) ? 0 : 1;
      const bSelected = selectedSet.has(b.value) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [options, searchQuery, selected]);

  const optionGridClassName =
    "grid grid-cols-2 gap-x-2 gap-y-1 overflow-y-auto pr-1 scrollbar-hidden";

  const optionsList =
    visibleOptions.length === 0 ? (
      <p className="py-3 text-sm text-slate-500">No matches for your search.</p>
    ) : (
      visibleOptions.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-100 bg-white px-2 py-1.5 text-sm hover:border-slate-200 hover:bg-slate-50"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => toggle(option.value)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
          />
          <span className="min-w-0 flex-1 truncate text-slate-700">{option.label}</span>
        </label>
      ))
    );

  if (embedded) {
    return (
      <div className="space-y-2">
        {description && <p className="text-xs text-slate-500">{description}</p>}
        {showSearch && (
          <FilterSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}…`}
          />
        )}
        <div className={`${optionGridClassName} ${maxHeight}`}>{optionsList}</div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Clear ({selected.length})
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="border-b border-slate-100 py-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
        <span className="text-xs text-slate-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {showSearch && (
            <FilterSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}…`}
            />
          )}
          <div className={`${optionGridClassName} ${maxHeight}`}>{optionsList}</div>
        </div>
      )}

      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          Clear ({selected.length})
        </button>
      )}
    </section>
  );
}
