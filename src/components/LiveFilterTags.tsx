"use client";

import { useEffect, useState } from "react";
import { getAppliedFilterTags } from "@/lib/applied-filter-tags";
import { parseLeadQuery } from "@/lib/parse-lead-query";

const DEBOUNCE_MS = 280;
const MIN_QUERY_LENGTH = 3;

interface LiveFilterTagsProps {
  query: string;
  className?: string;
}

export default function LiveFilterTags({
  query,
  className = "",
}: LiveFilterTagsProps) {
  const [tags, setTags] = useState<Array<{ label: string }>>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setTags([]);
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        const filters = parseLeadQuery(trimmed);
        setTags(getAppliedFilterTags(filters));
      } catch {
        setTags([]);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  if (tags.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap gap-1.5 ${className}`}
      aria-live="polite"
      aria-label="Detected filters"
    >
      {tags.map((tag) => (
        <span
          key={tag.label}
          className="filter-chip-pop inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800"
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
  );
}
