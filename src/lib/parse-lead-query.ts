import type { SearchFilters } from "@/types/lead";
import {
  extractEmployeeSizesFromQuery,
  extractIndustriesFromQuery,
  extractJobTitleFromQuery,
  refineFiltersFromQuery,
} from "@/lib/refine-ai-filters";

export function parseLeadQuery(query: string): Partial<SearchFilters> {
  const trimmed = query.trim();
  if (!trimmed) return {};

  const filters: Partial<SearchFilters> = {
    searchMode: "people",
    page: 1,
    perPage: 20,
    jobTitle: extractJobTitleFromQuery(trimmed),
    employeeSizes: extractEmployeeSizesFromQuery(trimmed),
    industries: extractIndustriesFromQuery(trimmed),
  };

  return refineFiltersFromQuery(
    trimmed,
    Object.fromEntries(
      Object.entries(filters).filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== "";
      }),
    ),
  );
}
