"use client";

import { useState } from "react";
import type { FilterOption } from "@/lib/filter-options";

interface FilterSectionProps {
  title: string;
  description?: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  defaultOpen?: boolean;
  maxHeight?: string;
  embedded?: boolean;
}

export default function FilterSection({
  title,
  description,
  options,
  selected,
  onChange,
  defaultOpen = true,
  maxHeight = "max-h-48",
  embedded = false,
}: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  }

  if (embedded) {
    return (
      <div className="space-y-2">
        {description && <p className="text-xs text-slate-500">{description}</p>}
        <div className={`space-y-1 overflow-y-auto pr-1 scrollbar-hidden ${maxHeight}`}>
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-white"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-slate-700">{option.label}</span>
            </label>
          ))}
        </div>
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
        <div className={`mt-2 space-y-1 overflow-y-auto pr-1 scrollbar-hidden ${maxHeight}`}>
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-slate-700">{option.label}</span>
            </label>
          ))}
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
