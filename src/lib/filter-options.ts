export type { FilterOption, RangeFilterOption } from "@/lib/generated/filter-options-data";

export {
  ANNUAL_REVENUE_OPTIONS,
  COMPANY_PRESET_OPTIONS,
  COMPANY_TYPE_OPTIONS,
  DEGREE_OPTIONS,
  DEPARTMENT_JOB_FUNCTION_OPTIONS,
  DOMAIN_PRESET_OPTIONS,
  EMPLOYEE_SIZE_OPTIONS,
  FIELD_OF_STUDY_OPTIONS,
  FUNDING_OPTIONS,
  HEADCOUNT_JOB_FUNCTION_OPTIONS,
  HEADCOUNT_TIME_FRAME_OPTIONS,
  INDUSTRY_OPTIONS,
  JOB_TITLE_OPTIONS,
  KEYWORD_SOURCE_OPTIONS,
  LINKEDIN_BADGE_OPTIONS,
  PERSON_LANGUAGE_OPTIONS,
  COMPANY_LANGUAGE_OPTIONS,
  PRODUCTS_SERVICES_OPTIONS,
  SENIORITY_OPTIONS,
  SOCIAL_MEDIA_OPTIONS,
  TECHNOLOGY_OPTIONS,
} from "@/lib/generated/filter-options-data";

import {
  DEPARTMENT_JOB_FUNCTION_OPTIONS,
  EMPLOYEE_SIZE_OPTIONS,
} from "@/lib/generated/filter-options-data";

const EMPLOYEE_SIZE_BUCKETS = EMPLOYEE_SIZE_OPTIONS.map((option) => ({
  value: option.value,
  start: option.start,
  end: option.end,
}));

export function parseEmployeeSizeRange(
  value: string,
): { start: number; end: number } | null {
  if (value.endsWith("+")) {
    const start = Number(value.slice(0, -1));
    return Number.isFinite(start) ? { start, end: Number.MAX_SAFE_INTEGER } : null;
  }
  const match = value.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]) };
}

export function parseRevenueSizeRange(
  value: string,
): { start: number; end: number } | null {
  return parseEmployeeSizeRange(value);
}

/** Parse integers that may include thousands separators (e.g. "1,000"). */
export function parseFlexibleInt(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!/^\d{1,7}$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNumericEmployeeRange(
  value: string,
): { start: number; end: number } | null {
  const trimmed = value.trim();
  if (trimmed.endsWith("+")) {
    const start = Number(trimmed.slice(0, -1).replace(/,/g, ""));
    return Number.isFinite(start)
      ? { start, end: Number.MAX_SAFE_INTEGER }
      : null;
  }

  const match = trimmed.match(
    /^(\d{1,3}(?:,\d{3})*|\d{1,7})\s*[-–—]\s*(\d{1,3}(?:,\d{3})*|\d{1,7})$/,
  );
  if (!match) return null;

  const start = parseFlexibleInt(match[1]);
  const end = parseFlexibleInt(match[2]);
  if (start === null || end === null || end < start) {
    return null;
  }

  return { start, end };
}

export function mapNumericRangeToEmployeeBuckets(
  start: number,
  end: number,
): string[] {
  const sizes = new Set<string>();

  for (const bucket of EMPLOYEE_SIZE_BUCKETS) {
    const overlapStart = Math.max(bucket.start, start);
    const overlapEnd = Math.min(bucket.end, end);
    if (overlapEnd > overlapStart) {
      sizes.add(bucket.value);
    } else if (
      overlapStart === overlapEnd &&
      overlapStart === start &&
      start === bucket.start
    ) {
      sizes.add(bucket.value);
    }
  }

  return [...sizes];
}

export function normalizeEmployeeSizeValues(values: string[]): {
  buckets: string[];
  customRange?: { start: number; end: number };
} {
  const allowed = EMPLOYEE_SIZE_OPTIONS.map((option) => option.value);
  const allowedMap = new Map(
    allowed.map((value) => [value.toLowerCase(), value]),
  );
  const buckets = new Set<string>();
  let customRange: { start: number; end: number } | undefined;

  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const exact = allowedMap.get(trimmed.toLowerCase());
    if (exact) {
      buckets.add(exact);
      continue;
    }

    const numeric = parseNumericEmployeeRange(trimmed);
    if (!numeric) continue;

    customRange = numeric;
    for (const bucket of mapNumericRangeToEmployeeBuckets(
      numeric.start,
      numeric.end,
    )) {
      buckets.add(bucket);
    }
  }

  return {
    buckets: [...buckets],
    customRange,
  };
}

/** @deprecated Use DEPARTMENT_JOB_FUNCTION_OPTIONS from generated data. */
export const DEPARTMENT_OPTIONS = DEPARTMENT_JOB_FUNCTION_OPTIONS;
