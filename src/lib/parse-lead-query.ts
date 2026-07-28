import type { SearchFilters } from "@/types/lead";
import {
  extractAnnualRevenueFromQuery,
  extractEmployeeSizesFromQuery,
  extractExperienceYearsFromQuery,
  extractIndustriesFromQuery,
  extractJobTitleFromQuery,
  extractLocationsFromQuery,
  extractSenioritiesFromQuery,
  refineFiltersFromQuery,
} from "@/lib/refine-ai-filters";

export function parseLeadQuery(query: string): Partial<SearchFilters> {
  const trimmed = query.trim();
  if (!trimmed) return {};

  const experience = extractExperienceYearsFromQuery(trimmed);
  const revenue = extractAnnualRevenueFromQuery(trimmed);

  const filters: Partial<SearchFilters> = {
    searchMode: "people",
    page: 1,
    perPage: 20,
    jobTitle: extractJobTitleFromQuery(trimmed),
    employeeSizes: extractEmployeeSizesFromQuery(trimmed),
    industries: extractIndustriesFromQuery(trimmed),
    locations: extractLocationsFromQuery(trimmed),
    seniorities: extractSenioritiesFromQuery(trimmed),
    ...(experience?.min !== undefined
      ? { experienceYearsMin: experience.min }
      : {}),
    ...(experience?.max !== undefined
      ? { experienceYearsMax: experience.max }
      : {}),
    ...(revenue
      ? {
          annualRevenue: revenue.label,
          ...(revenue.min !== undefined
            ? { annualRevenueMin: revenue.min }
            : {}),
          ...(revenue.max !== undefined
            ? { annualRevenueMax: revenue.max }
            : {}),
        }
      : {}),
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
