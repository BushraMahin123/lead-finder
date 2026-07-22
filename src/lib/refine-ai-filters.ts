import {
  mapNumericRangeToEmployeeBuckets,
  parseFlexibleInt,
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

/** Filler words stripped from the start of a "role in/at location" phrase. */
const TITLE_LEADING_FILLER = new Set([
  "find",
  "finding",
  "search",
  "searching",
  "show",
  "me",
  "us",
  "please",
  "i",
  "im",
  "i'm",
  "we",
  "get",
  "need",
  "want",
  "looking",
  "for",
  "some",
  "any",
  "all",
  "the",
  "a",
  "an",
  "of",
  "linkedin",
  "profiles",
  "profile",
]);

/** Org/generic nouns that are not job titles when alone or trailing. */
const TITLE_ORG_STOPWORDS = new Set([
  "company",
  "companies",
  "startup",
  "startups",
  "people",
  "person",
  "persons",
  "employee",
  "employees",
  "team",
  "teams",
  "office",
  "offices",
  "firm",
  "firms",
  "business",
  "businesses",
  "organization",
  "organizations",
  "org",
  "orgs",
  "lead",
  "leads",
  "contact",
  "contacts",
  "candidate",
  "candidates",
  "professional",
  "professionals",
  "worker",
  "workers",
  "role",
  "roles",
  "title",
  "titles",
]);

/** Single tokens that are industries/topics, not job titles. */
const TITLE_INDUSTRY_ONLY = new Set([
  "saas",
  "software",
  "fintech",
  "healthcare",
  "retail",
  "consulting",
]);

const TITLE_BEFORE_LOCATION_PATTERN =
  /\b((?:[a-z][a-z0-9&/-]*\s+){0,6}[a-z][a-z0-9&/-]*)\s+(?:in|at|from|near|based\s+in)\b/i;

const NUMBER = String.raw`(\d{1,3}(?:,\d{3})*|\d{1,7})`;

const EMPLOYEE_RANGE_PATTERNS = [
  new RegExp(
    String.raw`\bof\s+employ\w*\s+${NUMBER}\s*[-–—]\s*${NUMBER}\b`,
    "i",
  ),
  new RegExp(String.raw`\bemploy\w*\s+${NUMBER}\s*[-–—]\s*${NUMBER}\b`, "i"),
  new RegExp(
    String.raw`\b${NUMBER}\s*[-–—]\s*${NUMBER}\s+employ\w*\b`,
    "i",
  ),
  new RegExp(
    String.raw`\bwith\s+${NUMBER}\s*[-–—]\s*${NUMBER}\s+employ\w*\b`,
    "i",
  ),
  new RegExp(
    String.raw`\b(?:companies?|company)\s+with\s+${NUMBER}\s*[-–—]\s*${NUMBER}\s+employ\w*\b`,
    "i",
  ),
  new RegExp(
    String.raw`\b(?:companies?|company)\s+(?:of\s+)?employ\w*\s+${NUMBER}\s*[-–—]\s*${NUMBER}\b`,
    "i",
  ),
  new RegExp(String.raw`\b${NUMBER}\s+to\s+${NUMBER}\s+employ\w*\b`, "i"),
];

const INDUSTRY_PHRASES: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bsaas\b/i, value: "software development" },
  { pattern: /\bsoftware\s+(?:compan|firms?|startups?)\w*/i, value: "software development" },
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

const EXPERIENCE_MIN_PATTERNS = [
  /\b(\d{1,2})\s*\+\s*years?(?:\s+of)?(?:\s+experience|\s+exp\.?)?\b/i,
  /\b(?:at\s+least|minimum\s+of|min(?:imum)?)\s+(\d{1,2})\s+years?(?:\s+of)?(?:\s+experience|\s+exp\.?)?\b/i,
  /\b(?:more\s+than|over|above)\s+(\d{1,2})\s+years?(?:\s+of)?(?:\s+experience|\s+exp\.?)?\b/i,
  /\b(\d{1,2})\s+or\s+more\s+years?(?:\s+of)?(?:\s+experience|\s+exp\.?)?\b/i,
  /\bwith\s+(\d{1,2})\s*\+?\s*years?(?:\s+of)?\s+experience\b/i,
  /\bwho\s+have\s+(\d{1,2})\s*\+?\s*years?(?:\s+of)?\s+experience\b/i,
];

const EXPERIENCE_RANGE_PATTERNS = [
  /\b(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+years?(?:\s+of)?(?:\s+experience|\s+exp\.?)?\b/i,
  /\bbetween\s+(\d{1,2})\s+and\s+(\d{1,2})\s+years?(?:\s+of)?(?:\s+experience|\s+exp\.?)?\b/i,
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

function extractTitleBeforeLocation(query: string): string | undefined {
  const match = query.match(TITLE_BEFORE_LOCATION_PATTERN);
  if (!match?.[1]) return undefined;

  const words = match[1]
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  while (words.length > 0 && TITLE_LEADING_FILLER.has(words[0].toLowerCase())) {
    words.shift();
  }

  while (
    words.length > 0 &&
    TITLE_ORG_STOPWORDS.has(words[words.length - 1].toLowerCase())
  ) {
    words.pop();
  }

  if (words.length === 0) return undefined;

  const lowerWords = words.map((word) => word.toLowerCase());
  if (lowerWords.every((word) => TITLE_ORG_STOPWORDS.has(word))) {
    return undefined;
  }

  if (words.length === 1 && TITLE_INDUSTRY_ONLY.has(lowerWords[0])) {
    return undefined;
  }

  return formatExtractedTitle(words.join(" "));
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

  return extractTitleBeforeLocation(query);
}

function extractMaxEmployeeCountFromQuery(query: string): number | null {
  for (const pattern of MAX_EMPLOYEE_PATTERNS) {
    const match = query.match(pattern);
    if (!match?.[1]) continue;

    const limit = parseFlexibleInt(match[1]);
    if (limit === null || limit <= 0) continue;

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

    const start = parseFlexibleInt(match[1]);
    const end = parseFlexibleInt(match[2]);
    if (start === null || end === null || end < start) {
      continue;
    }

    return { start, end };
  }

  if (/\b(?:employ|compan|staff|headcount|saas)\w*/i.test(query)) {
    const matches = [
      ...query.matchAll(
        new RegExp(String.raw`\b${NUMBER}\s*[-–—]\s*${NUMBER}\b`, "g"),
      ),
    ];
    const last = matches.at(-1);
    if (last) {
      const start = parseFlexibleInt(last[1]);
      const end = parseFlexibleInt(last[2]);
      if (start !== null && end !== null && end >= start) {
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

export function extractExperienceYearsFromQuery(
  query: string,
): { min?: number; max?: number } | null {
  for (const pattern of EXPERIENCE_RANGE_PATTERNS) {
    const match = query.match(pattern);
    if (!match) continue;
    const min = Number(match[1]);
    const max = Number(match[2]);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) continue;
    return { min, max };
  }

  for (const pattern of EXPERIENCE_MIN_PATTERNS) {
    const match = query.match(pattern);
    if (!match?.[1]) continue;
    const min = Number(match[1]);
    if (!Number.isFinite(min) || min <= 0) continue;
    if (/more\s+than|over|above/i.test(match[0])) {
      return { min: min + 1 };
    }
    return { min };
  }

  return null;
}

export function extractSenioritiesFromQuery(query: string): string[] {
  const seniorities = new Set<string>();
  if (/\b(?:c[\s-]?level|c[\s-]?suite)\b/i.test(query)) seniorities.add("c_suite");
  if (/\bvp\b|\bvice\s+president\b/i.test(query)) seniorities.add("vp");
  if (/\bdirector\b/i.test(query)) seniorities.add("director");
  if (/\bhead\b/i.test(query)) seniorities.add("head");
  if (/\bmanager\b/i.test(query)) seniorities.add("manager");
  if (/\bsenior\b/i.test(query)) seniorities.add("senior");
  if (/\bmid[\s-]?level\b/i.test(query)) seniorities.add("mid-level");
  if (/\b(?:entry[\s-]?level|junior)\b/i.test(query)) seniorities.add("entry");
  if (/\bintern\b/i.test(query)) seniorities.add("intern");
  if (/\bfounder\b/i.test(query)) seniorities.add("founder");
  if (/\bowner\b/i.test(query)) seniorities.add("owner");
  if (/\bpartner\b/i.test(query)) seniorities.add("partner");
  return [...seniorities];
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

function preferSpecificLocations(locations: string[]): string[] {
  const usStates = new Set(
    (
      PERSON_LOCATION_REGIONS.find((region) => region.value === "United States")
        ?.states ?? []
    ).map((state) => state.value),
  );
  const hasUsStates = locations.some((location) => usStates.has(location));
  if (hasUsStates && locations.includes("United States")) {
    return locations.filter((location) => location !== "United States");
  }
  return locations;
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

  const extractedExperience = extractExperienceYearsFromQuery(query);
  if (extractedExperience) {
    if (typeof extractedExperience.min === "number") {
      refined.experienceYearsMin = extractedExperience.min;
    } else {
      delete refined.experienceYearsMin;
    }
    if (typeof extractedExperience.max === "number") {
      refined.experienceYearsMax = extractedExperience.max;
    } else {
      delete refined.experienceYearsMax;
    }
  }

  const extractedSeniorities = extractSenioritiesFromQuery(query);
  if (extractedSeniorities.length > 0) {
    refined.seniorities = [
      ...new Set([...(refined.seniorities ?? []), ...extractedSeniorities]),
    ];
  }

  const extractedIndustries = extractIndustriesFromQuery(query);
  if (extractedIndustries.length > 0) {
    refined.industries = [
      ...new Set([...(refined.industries ?? []), ...extractedIndustries]),
    ];
  }

  const extractedLocations = extractLocationsFromQuery(query);
  if (extractedLocations.length > 0) {
    refined.locations = preferSpecificLocations([
      ...new Set([...(refined.locations ?? []), ...extractedLocations]),
    ]);
  } else if (refined.locations?.length) {
    refined.locations = preferSpecificLocations(refined.locations);
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
