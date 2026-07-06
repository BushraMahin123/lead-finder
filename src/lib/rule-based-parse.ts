import { hasAnySearchFilters } from "@/lib/gemini-filter-schema";
import { parseLeadQuery } from "@/lib/parse-lead-query";
import {
  extractEmployeeSizesFromQuery,
  extractIndustriesFromQuery,
  extractJobTitleFromQuery,
  extractLocationsFromQuery,
} from "@/lib/refine-ai-filters";
import type { SearchFilters } from "@/types/lead";

const COMPLEX_QUERY_PATTERN =
  /\b(exclude|except|not\s+in|without|series\s+[a-d]|funded|startup|unicorn|ycombinator|yc)\b/i;

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function titlesMatch(expected: string, actual: string): boolean {
  const left = normalizeTitle(expected);
  const right = normalizeTitle(actual);
  if (left === right || right.includes(left) || left.includes(right)) return true;

  const acronym = left.replace(/\s/g, "");
  const actualAcronym = right.replace(/\s/g, "");
  return acronym.length <= 4 && acronym === actualAcronym;
}

function includesAll(values: string[] | undefined, expected: string[]): boolean {
  if (expected.length === 0) return true;
  const haystack = new Set((values ?? []).map((value) => value.toLowerCase()));
  return expected.every((value) => haystack.has(value.toLowerCase()));
}

function countFilterDimensions(filters: Partial<SearchFilters>): number {
  let count = 0;
  if (filters.jobTitle?.trim()) count++;
  if (filters.industries?.length) count++;
  if (filters.locations?.length) count++;
  if (filters.employeeSizes?.length) count++;
  if (
    typeof filters.employeeCountMin === "number" &&
    typeof filters.employeeCountMax === "number"
  ) {
    count++;
  }
  if (filters.companyName?.trim()) count++;
  if (filters.companyDomain?.trim()) count++;
  if (filters.seniorities?.length) count++;
  if (filters.departments?.length) count++;
  if (filters.linkedInUrls?.trim()) count++;
  if (filters.keywords?.trim()) count++;
  return count;
}

export function parseLeadQueryWithRules(query: string): Partial<SearchFilters> {
  return parseLeadQuery(query);
}

export function isRuleBasedParseSufficient(
  query: string,
  filters: Partial<SearchFilters>,
): boolean {
  if (!hasAnySearchFilters(filters)) return false;

  const expectedTitle = extractJobTitleFromQuery(query);
  if (expectedTitle) {
    if (!filters.jobTitle || !titlesMatch(expectedTitle, filters.jobTitle)) {
      return false;
    }
  }

  const expectedIndustries = extractIndustriesFromQuery(query);
  if (!includesAll(filters.industries, expectedIndustries)) {
    return false;
  }

  const expectedSizes = extractEmployeeSizesFromQuery(query);
  if (!includesAll(filters.employeeSizes, expectedSizes)) {
    return false;
  }

  const expectedLocations = extractLocationsFromQuery(query);
  if (!includesAll(filters.locations, expectedLocations)) {
    return false;
  }

  if (COMPLEX_QUERY_PATTERN.test(query) && countFilterDimensions(filters) < 2) {
    return false;
  }

  const words = query.trim().split(/\s+/).filter(Boolean).length;
  const dimensions = countFilterDimensions(filters);

  if (dimensions >= 2) return true;
  if (dimensions >= 1 && words <= 10) return true;

  return false;
}

export function ruleBasedFallback(query: string): Partial<SearchFilters> | null {
  const filters = parseLeadQueryWithRules(query);
  return hasAnySearchFilters(filters) ? filters : null;
}
