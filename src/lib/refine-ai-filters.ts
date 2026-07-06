import {
  mapNumericRangeToEmployeeBuckets,
  parseNumericEmployeeRange,
} from "@/lib/filter-options";
import {
  PERSON_LOCATION_REGIONS,
  REMOTE_LOCATION,
} from "@/lib/location-regions";
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

const LOCATION_PHRASES: Array<{ pattern: RegExp; value: string }> = [
  {
    pattern: /\b(?:in|from)\s+the\s+us\b|\bunited states\b|\bu\.s\.a?\.?\b|\bin\s+us\b/i,
    value: "United States",
  },
  {
    pattern: /\b(?:in|from)\s+(?:the\s+)?uk\b|\bunited kingdom\b|\bbritain\b/i,
    value: "United Kingdom",
  },
  { pattern: /\b(?:in|from)\s+canada\b/i, value: "Canada" },
  { pattern: /\b(?:in|from)\s+germany\b/i, value: "Germany" },
  { pattern: /\b(?:in|from)\s+france\b/i, value: "France" },
  { pattern: /\b(?:in|from)\s+australia\b/i, value: "Australia" },
  { pattern: /\b(?:in|from)\s+india\b/i, value: "India" },
  { pattern: /\b(?:in|from)\s+singapore\b/i, value: "Singapore" },
  {
    pattern: /\b(?:in|from)\s+(?:the\s+)?uae\b|\bunited arab emirates\b/i,
    value: "United Arab Emirates",
  },
  { pattern: /\b(?:in|from)\s+netherlands\b|\bholland\b/i, value: "Netherlands" },
  { pattern: /\bsilicon\s+valley\b/i, value: "San Francisco" },
  { pattern: /\bbay\s+area\b/i, value: "San Francisco" },
];

const LOCATION_MULTI_PHRASES: Array<{ pattern: RegExp; values: string[] }> = [
  {
    pattern: /\bsilicon\s+valley\b/i,
    values: ["San Francisco", "San Jose", "California"],
  },
  {
    pattern: /\bbay\s+area\b/i,
    values: ["San Francisco", "Oakland", "California"],
  },
];

const EXECUTIVE_ACRONYMS = new Map<string, string>([
  ["ceo", "CEO"],
  ["cfo", "CFO"],
  ["cto", "CTO"],
  ["coo", "COO"],
  ["cmo", "CMO"],
]);

const MAX_EMPLOYEE_PATTERNS = [
  /\b(?:less|fewer|under|below)\s+than\s+(\d{1,5})\s+employees?\b/i,
  /\b(?:less|fewer|under|below)\s+(\d{1,5})\s+employees?\b/i,
  /\bat\s+most\s+(\d{1,5})\s+employees?\b/i,
  /\b(?:max|maximum)\s+of\s+(\d{1,5})\s+employees?\b/i,
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NOISE_KEYWORD_PATTERN =
  /^(?:-?\d+|employees?|employee|companies?|company|saas|software|with|of|at|in|for|and|the|a|an)$/i;

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatExtractedTitle(value: string): string {
  const normalized = value.trim().toLowerCase();
  return EXECUTIVE_ACRONYMS.get(normalized) ?? titleCase(value);
}

export function extractJobTitleFromQuery(query: string): string | undefined {
  for (const pattern of JOB_TITLE_PATTERNS) {
    const match = query.match(pattern);
    if (match?.[1]) {
      return formatExtractedTitle(
        match[1].replace(/\s+of\s+employees?.*$/i, "").trim(),
      );
    }
  }
  return undefined;
}

function extractMaxEmployeeCountFromQuery(query: string): number | null {
  for (const pattern of MAX_EMPLOYEE_PATTERNS) {
    const match = query.match(pattern);
    if (!match?.[1]) continue;

    const limit = Number(match[1]);
    if (!Number.isFinite(limit) || limit <= 0) continue;

    return Math.max(1, limit - 1);
  }

  return null;
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
  const maxEmployees = extractMaxEmployeeCountFromQuery(query);

  if (numericRange) {
    for (const bucket of mapNumericRangeToEmployeeBuckets(
      numericRange.start,
      numericRange.end,
    )) {
      sizes.add(bucket);
    }
  }

  if (maxEmployees !== null) {
    for (const bucket of mapNumericRangeToEmployeeBuckets(1, maxEmployees)) {
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

export function extractLocationsFromQuery(query: string): string[] {
  const locations = new Set<string>();

  for (const { pattern, values } of LOCATION_MULTI_PHRASES) {
    if (pattern.test(query)) {
      for (const value of values) locations.add(value);
    }
  }

  for (const { pattern, value } of LOCATION_PHRASES) {
    if (pattern.test(query)) locations.add(value);
  }

  for (const region of PERSON_LOCATION_REGIONS) {
    if (new RegExp(`\\b${escapeRegExp(region.value)}\\b`, "i").test(query)) {
      locations.add(region.value);
    }

    for (const city of region.cities ?? []) {
      if (new RegExp(`\\b${escapeRegExp(city.value)}\\b`, "i").test(query)) {
        locations.add(city.value);
      }
    }

    for (const state of region.states ?? []) {
      if (new RegExp(`\\b${escapeRegExp(state.value)}\\b`, "i").test(query)) {
        locations.add(state.value);
      }

      for (const city of state.cities ?? []) {
        if (new RegExp(`\\b${escapeRegExp(city.value)}\\b`, "i").test(query)) {
          locations.add(city.value);
        }
      }
    }
  }

  if (/\bremote\b/i.test(query)) {
    locations.add(REMOTE_LOCATION.value);
  }

  return [...locations];
}

export function extractTopicKeywordsFromQuery(query: string): string[] {
  const keywords = new Set<string>();

  if (/\bstartups?\b/i.test(query)) keywords.add("startup");
  if (/\benterprise\b/i.test(query)) keywords.add("enterprise");
  if (/\bb2b\b/i.test(query)) keywords.add("B2B");
  if (/\bb2c\b/i.test(query)) keywords.add("B2C");

  return [...keywords];
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

  const extractedLocations = extractLocationsFromQuery(query);
  if (extractedLocations.length > 0) {
    refined.locations = [
      ...new Set([...(refined.locations ?? []), ...extractedLocations]),
    ];
  }

  const topicKeywords = extractTopicKeywordsFromQuery(query);
  if (topicKeywords.length > 0) {
    const existing = refined.keywords
      ? refined.keywords.split(/,\s*/).filter(Boolean)
      : [];
    refined.keywords = [...new Set([...existing, ...topicKeywords])].join(", ");
  }

  const cleanedKeywords = cleanKeywords(refined.keywords, refined);
  if (cleanedKeywords) {
    refined.keywords = cleanedKeywords;
  } else {
    delete refined.keywords;
  }

  if (refined.seniorities?.length === 0) delete refined.seniorities;
  if (refined.industries?.length === 0) delete refined.industries;
  if (refined.locations?.length === 0) delete refined.locations;
  if (refined.employeeSizes?.length === 0) delete refined.employeeSizes;

  return refined;
}
