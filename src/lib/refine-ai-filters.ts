import {
  mapNumericRangeToEmployeeBuckets,
  parseNumericEmployeeRange,
} from "@/lib/filter-options";
import type { SearchFilters } from "@/types/lead";

const JOB_TITLE_PATTERNS = [
  /\b((?:vp|vice president)\s+of\s+[a-z][a-z\s&/-]{0,40}?)(?=\s+at\b|\s+in\b|\s+with\b|\s+for\b|,|$)/i,
  /\b((?:director|head|manager|lead)\s+of\s+[a-z][a-z\s&/-]{0,40}?)(?=\s+at\b|\s+in\b|\s+with\b|\s+for\b|,|$)/i,
  /\b((?:chief|senior|junior|associate)\s+[a-z][a-z\s&/-]{0,40}?)(?=\s+at\b|\s+in\b|\s+with\b|\s+for\b|,|$)/i,
  /\b(ceo|cfo|cto|coo|cmo|founder|co-founder|owner|partner)\b/i,
];

const EMPLOYEE_RANGE_PATTERNS = [
  /\bof\s+employ\w*\s+(\d{1,5})\s*[-–]\s*(\d{1,5})\b/i,
  /\bemploy\w*\s+(\d{1,5})\s*[-–]\s*(\d{1,5})\b/i,
  /\b(\d{1,5})\s*[-–]\s*(\d{1,5})\s+employ\w*\b/i,
  /\bwith\s+(\d{1,5})\s*[-–]\s*(\d{1,5})\s+employ\w*\b/i,
  /\b(?:companies?|company)\s+(?:of\s+)?employ\w*\s+(\d{1,5})\s*[-–]\s*(\d{1,5})\b/i,
];

const INDUSTRY_PHRASES: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bsaas\b/i, value: "software development" },
  { pattern: /\bsoftware\b/i, value: "software development" },
  { pattern: /\bfintech\b/i, value: "financial services" },
  { pattern: /\bhealthcare\b|\bhealth care\b/i, value: "hospitals and health care" },
  { pattern: /\bretail\b/i, value: "retail" },
  { pattern: /\bconsulting\b/i, value: "management consulting" },
];

const NOISE_KEYWORD_PATTERN =
  /^(?:-?\d+|employees?|employee|companies?|company|saas|software|with|of|at|in|for|and|the|a|an)$/i;

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function extractJobTitleFromQuery(query: string): string | undefined {
  for (const pattern of JOB_TITLE_PATTERNS) {
    const match = query.match(pattern);
    if (match?.[1]) {
      return titleCase(match[1].replace(/\s+of\s+employees?.*$/i, "").trim());
    }
  }
  return undefined;
}

export function extractEmployeeCountRangeFromQuery(
  query: string,
): { start: number; end: number } | null {
  for (const pattern of EMPLOYEE_RANGE_PATTERNS) {
    const match = query.match(pattern);
    if (!match) continue;

    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      continue;
    }

    return { start, end };
  }

  if (/\b(?:employ|compan|staff|headcount|saas)\w*/i.test(query)) {
    const matches = [...query.matchAll(/\b(\d{1,5})\s*[-–]\s*(\d{1,5})\b/g)];
    const last = matches.at(-1);
    if (last) {
      const start = Number(last[1]);
      const end = Number(last[2]);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        return { start, end };
      }
    }
  }

  return null;
}

export function extractEmployeeSizesFromQuery(query: string): string[] {
  const sizes = new Set<string>();
  const numericRange = extractEmployeeCountRangeFromQuery(query);

  if (numericRange) {
    for (const bucket of mapNumericRangeToEmployeeBuckets(
      numericRange.start,
      numericRange.end,
    )) {
      sizes.add(bucket);
    }
  }

  const bucketPatterns = [
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1001-5000",
    "5001-10000",
    "10001+",
  ];
  for (const bucket of bucketPatterns) {
    const exact = new RegExp(`\\b${bucket.replace("+", "\\+")}\\b`, "i");
    if (exact.test(query)) sizes.add(bucket);
  }

  return [...sizes];
}

export function extractIndustriesFromQuery(query: string): string[] {
  const industries = new Set<string>();
  for (const { pattern, value } of INDUSTRY_PHRASES) {
    if (pattern.test(query)) industries.add(value);
  }
  return [...industries];
}

function cleanJobTitle(value: string | undefined): string | undefined {
  if (!value) return undefined;

  let cleaned = value.trim();
  cleaned = cleaned.split(/\s+at\s+/i)[0] ?? cleaned;
  cleaned = cleaned.split(/\s+in\s+/i)[0] ?? cleaned;
  cleaned = cleaned.replace(/\s+of\s+employees?.*$/i, "");
  cleaned = cleaned.replace(/\s+employees?\s+\d.*$/i, "");
  cleaned = cleaned.replace(/\s+(companies?|company)\b.*$/i, "");
  cleaned = cleaned.trim();

  if (!cleaned || cleaned.length > 60) return undefined;
  if (/\bemployees?\b/i.test(cleaned)) return undefined;

  return titleCase(cleaned);
}

function cleanKeywords(
  value: string | undefined,
  filters: Partial<SearchFilters>,
): string | undefined {
  if (!value) return undefined;

  const banned = new Set<string>([
    ...(filters.industries ?? []).flatMap((industry) => industry.split(/\s+/)),
    ...(filters.jobTitle ?? "").toLowerCase().split(/\s+/),
    "saas",
    "software",
    "employees",
    "employee",
    "companies",
    "company",
  ]);

  const parts = value
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !NOISE_KEYWORD_PATTERN.test(part))
    .filter((part) => !banned.has(part.toLowerCase()))
    .filter((part) => !/^\d{1,6}\s*[-–]\s*\d{1,6}$/.test(part));

  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

function shouldReplaceJobTitle(current: string | undefined, extracted: string | undefined) {
  if (!extracted) return false;
  if (!current) return true;

  const lower = current.toLowerCase();
  return (
    lower.includes(" at ") ||
    lower.includes(" companies") ||
    lower.includes(" employee") ||
    current.length > extracted.length + 10
  );
}

export function refineFiltersFromQuery(
  query: string,
  filters: Partial<SearchFilters>,
): Partial<SearchFilters> {
  const refined: Partial<SearchFilters> = { ...filters };

  const extractedTitle = extractJobTitleFromQuery(query);
  const cleanedCurrentTitle = cleanJobTitle(refined.jobTitle);
  const cleanedExtractedTitle = cleanJobTitle(extractedTitle);

  if (shouldReplaceJobTitle(cleanedCurrentTitle, cleanedExtractedTitle)) {
    refined.jobTitle = cleanedExtractedTitle;
  } else if (cleanedCurrentTitle) {
    refined.jobTitle = cleanedCurrentTitle;
  } else {
    delete refined.jobTitle;
  }

  const extractedSizes = extractEmployeeSizesFromQuery(query);
  const extractedCountRange = extractEmployeeCountRangeFromQuery(query);
  if (extractedSizes.length > 0) {
    refined.employeeSizes = extractedSizes;
  }
  if (extractedCountRange) {
    refined.employeeCountMin = extractedCountRange.start;
    refined.employeeCountMax = extractedCountRange.end;
  } else {
    delete refined.employeeCountMin;
    delete refined.employeeCountMax;
  }

  const extractedIndustries = extractIndustriesFromQuery(query);
  if (extractedIndustries.length > 0) {
    refined.industries = [
      ...new Set([...(refined.industries ?? []), ...extractedIndustries]),
    ];
  }

  const cleanedKeywords = cleanKeywords(refined.keywords, refined);
  if (cleanedKeywords) {
    refined.keywords = cleanedKeywords;
  } else {
    delete refined.keywords;
  }

  if (refined.seniorities?.length === 0) delete refined.seniorities;
  if (refined.industries?.length === 0) delete refined.industries;
  if (refined.employeeSizes?.length === 0) delete refined.employeeSizes;

  return refined;
}
