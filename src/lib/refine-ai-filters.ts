import {
  ANNUAL_REVENUE_OPTIONS,
  mapNumericRangeToEmployeeBuckets,
  parseFlexibleInt,
} from "@/lib/filter-options";
import {
  PERSON_LOCATION_REGIONS,
  REMOTE_LOCATION,
  locationMentionedInText,
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

/** Single tokens / short phrases that are industries/topics, not job titles. */
const TITLE_INDUSTRY_ONLY = new Set([
  "saas",
  "software",
  "fintech",
  "healthcare",
  "retail",
  "consulting",
  "call center",
  "call centers",
  "ecommerce",
  "e-commerce",
  "e commerce",
]);

/** Words that end the job-title part of a query and start the company part. */
const TITLE_COMPANY_CLAUSE_STARTERS = new Set([
  "at",
  "for",
  "with",
  "working",
  "from",
]);

/**
 * Person-role nouns. A phrase ending in one of these is a job title even when it
 * also mentions an industry word ("software developers", "healthcare recruiters").
 */
const ROLE_NOUN_PATTERN =
  /\b(?:ceo|cfo|cto|coo|cmo|cro|cio|cpo|cso|vp|svp|evp|gm|founders?|co-?founders?|owners?|partners?|presidents?|chair(?:man|woman|person)s?|directors?|managers?|heads?|leads?|chiefs?|officers?|executives?|supervisors?|principals?|engineers?|developers?|programmers?|architects?|designers?|scientists?|analysts?|researchers?|consultants?|advisors?|advisers?|specialists?|strategists?|marketers?|recruiters?|accountants?|bookkeepers?|attorneys?|lawyers?|doctors?|physicians?|nurses?|dentists?|therapists?|teachers?|professors?|writers?|editors?|copywriters?|photographers?|videographers?|producers?|agents?|brokers?|realtors?|reps?|representatives?|salespersons?|coordinators?|administrators?|assistants?|technicians?|operators?|chefs?|trainers?|coaches|auditors?|controllers?|treasurers?|buyers?|planners?|generalists?)\s*$/i;

/** Whether a phrase names a person's role rather than a company type. */
function looksLikeRolePhrase(phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase();
  if (!normalized) return false;
  if (EXECUTIVE_ACRONYMS.has(normalized.replace(/[^a-z]/g, ""))) return true;
  return ROLE_NOUN_PATTERN.test(normalized);
}

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
    String.raw`\bemploy\w*\s+${NUMBER}\s+(?:to|and)\s+${NUMBER}\b`,
    "i",
  ),
  new RegExp(
    String.raw`\bwith\s+employ\w*\s+${NUMBER}\s*[-–—]\s*${NUMBER}\b`,
    "i",
  ),
  new RegExp(
    String.raw`\bwith\s+employ\w*\s+${NUMBER}\s+(?:to|and)\s+${NUMBER}\b`,
    "i",
  ),
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
  // "employee size 1 to 10", "company size 1-10", "team size 5 to 20", "headcount 1-10"
  new RegExp(
    String.raw`\b(?:employ\w*|compan\w*|team|staff|headcount)?\s*(?:size|count)\s+(?:of\s+)?${NUMBER}\s*(?:[-–—]|to|and)\s*${NUMBER}\b`,
    "i",
  ),
];

const INDUSTRY_PHRASES: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bsaas\b/i, value: "software development" },
  { pattern: /\bsoftware\s+(?:compan|firms?|startups?)\w*/i, value: "software development" },
  { pattern: /\bfintech\b/i, value: "financial services" },
  { pattern: /\bhealthcare\b|\bhealth care\b/i, value: "hospitals and health care" },
  { pattern: /\bretail\b/i, value: "retail" },
  { pattern: /\bconsulting\b/i, value: "management consulting" },
  { pattern: /\bcall\s+cent(?:er|re)s?\b/i, value: "call center" },
  { pattern: /\be[\s-]?commerce\b/i, value: "e-commerce" },
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

  // "hr managers at healthcare companies" -> the title is only what precedes "at".
  const companyClauseStart = words.findIndex((word) =>
    TITLE_COMPANY_CLAUSE_STARTERS.has(word.toLowerCase()),
  );
  if (companyClauseStart === 0) return undefined;
  if (companyClauseStart > 0) words.length = companyClauseStart;

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

  const joined = lowerWords.join(" ");
  if (TITLE_INDUSTRY_ONLY.has(joined)) return undefined;

  // Industry phrases like "call centers" / "saas companies" are not job titles,
  // but "software developers" / "healthcare recruiters" still are.
  if (!looksLikeRolePhrase(joined)) {
    if (TITLE_INDUSTRY_ONLY.has(lowerWords[0])) return undefined;
    if (extractIndustriesFromQuery(joined).length > 0) return undefined;
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

const REVENUE_RANGE_PATTERNS = [
  /\$\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?\s*[-–—]\s*\$\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?/i,
  /\$\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?\s+(?:to|and)\s+\$\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?/i,
  /\b(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)\s+(?:to|and|[-–—])\s+(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)\b/i,
];

const REVENUE_MIN_PATTERNS = [
  /(?:annual\s+)?revenue\s+(?:over|above|more\s+than|at\s+least|>=?)\s+\$?\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?/i,
  /(?:over|above|more\s+than|at\s+least|>=?)\s+\$?\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?\s+(?:in\s+)?(?:annual\s+)?revenue/i,
  /\$\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?\+/i,
];

const REVENUE_MAX_PATTERNS = [
  /(?:annual\s+)?revenue\s+(?:under|below|less\s+than|up\s+to|<=?)\s+\$?\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?/i,
  /(?:under|below|less\s+than|up\s+to|<=?)\s+\$?\s*(\d+(?:\.\d+)?)\s*(k|m|b|million|billion|thousand)?\s+(?:in\s+)?(?:annual\s+)?revenue/i,
];

function parseRevenueAmount(amount: string, unit?: string): number | null {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;

  const normalizedUnit = (unit ?? "").toLowerCase();
  if (normalizedUnit === "k" || normalizedUnit === "thousand") {
    return Math.round(value * 1_000);
  }
  if (normalizedUnit === "m" || normalizedUnit === "million") {
    return Math.round(value * 1_000_000);
  }
  if (normalizedUnit === "b" || normalizedUnit === "billion") {
    return Math.round(value * 1_000_000_000);
  }

  if (value >= 1_000_000) return Math.round(value);
  if (value >= 1_000) return Math.round(value);
  return Math.round(value * 1_000_000);
}

function formatRevenueAmount(value: number): string {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    return `$${billions % 1 === 0 ? billions : billions.toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K`;
  }
  return `$${value}`;
}

function formatRevenueLabel(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) {
    return `${formatRevenueAmount(min)} - ${formatRevenueAmount(max)}`;
  }
  if (min !== undefined) return `${formatRevenueAmount(min)}+`;
  if (max !== undefined) return `Up to ${formatRevenueAmount(max)}`;
  return "";
}

function findMatchingRevenueBucket(
  min?: number,
  max?: number,
): string | null {
  if (min === undefined && max === undefined) return null;

  for (const option of ANNUAL_REVENUE_OPTIONS) {
    const optionMin = option.start;
    const optionMax = option.end;

    if (min !== undefined && max !== undefined) {
      if (min >= optionMin && max <= optionMax) return option.label;
      if (min <= optionMax && max >= optionMin) return option.label;
      continue;
    }

    if (min !== undefined) {
      if (min >= optionMin && min <= optionMax) return option.label;
      if (min <= optionMin && option.label.endsWith("+")) return option.label;
      continue;
    }

    if (max !== undefined && max >= optionMin && max <= optionMax) {
      return option.label;
    }
  }

  return null;
}

export function extractAnnualRevenueFromQuery(query: string): {
  label: string;
  min?: number;
  max?: number;
} | null {
  const normalized = query.trim();
  if (!normalized) return null;

  for (const pattern of REVENUE_RANGE_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const min = parseRevenueAmount(match[1], match[2]);
    const max = parseRevenueAmount(match[3], match[4]);
    if (min === null || max === null || min > max) continue;

    const bucket = findMatchingRevenueBucket(min, max);
    return {
      label: bucket ?? formatRevenueLabel(min, max),
      min,
      max,
    };
  }

  for (const pattern of REVENUE_MIN_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const min = parseRevenueAmount(match[1], match[2]);
    if (min === null) continue;

    const bucket = findMatchingRevenueBucket(min, undefined);
    return {
      label: bucket ?? formatRevenueLabel(min, undefined),
      min,
    };
  }

  for (const pattern of REVENUE_MAX_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const max = parseRevenueAmount(match[1], match[2]);
    if (max === null) continue;

    const bucket = findMatchingRevenueBucket(undefined, max);
    return {
      label: bucket ?? formatRevenueLabel(undefined, max),
      max,
    };
  }

  for (const option of ANNUAL_REVENUE_OPTIONS) {
    const escapedLabel = option.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const labelPattern = new RegExp(`\\b${escapedLabel.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (labelPattern.test(normalized)) {
      return {
        label: option.label,
        min: option.start,
        max: option.end,
      };
    }
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

/** Calculate Levenshtein distance between two strings */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Search vocabulary that must never be fuzzy-matched to a place name.
 * Without this, "size" becomes Turkey's province "Rize".
 */
const NON_LOCATION_WORDS = new Set([
  ...TITLE_ORG_STOPWORDS,
  "size",
  "sizes",
  "staff",
  "headcount",
  "count",
  "range",
  "between",
  "with",
  "without",
  "from",
  "and",
  "the",
  "for",
  "any",
  "all",
  "more",
  "most",
  "less",
  "least",
  "than",
  "over",
  "under",
  "above",
  "below",
  "about",
  "call",
  "calls",
  "center",
  "centers",
  "centre",
  "centres",
  "industry",
  "industries",
  "revenue",
  "funding",
  "funded",
  "series",
  "seed",
  "raised",
  "software",
  "saas",
  "fintech",
  "healthcare",
  "retail",
  "consulting",
  "ecommerce",
  "commerce",
  "agency",
  "agencies",
  "sales",
  "marketing",
  "finance",
  "engineering",
  "design",
  "legal",
  "operations",
  "manager",
  "managers",
  "director",
  "directors",
  "founder",
  "founders",
  "owner",
  "owners",
  "head",
  "heads",
  "senior",
  "junior",
  "level",
  "years",
  "year",
  "experience",
  "email",
  "emails",
  "phone",
  "phones",
  "small",
  "large",
  "medium",
  "top",
  "best",
  "find",
  "list",
  "need",
  "want",
  "using",
  "based",
  "located",
  "living",
  "near",
  "remote",
]);

/** Find the best matching location from allowed values using fuzzy matching */
function findBestLocationMatch(input: string, allowed: string[]): string | null {
  const normalizedInput = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalizedInput.length < 5) return null;
  if (NON_LOCATION_WORDS.has(normalizedInput)) return null;

  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const value of allowed) {
    const normalizedValue = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    // Only correct typos in names long enough that a near-miss is unambiguous.
    if (normalizedValue.length < 5) continue;

    const distance = levenshteinDistance(normalizedInput, normalizedValue);
    const maxDistance = normalizedValue.length >= 9 ? 2 : 1;

    if (distance <= maxDistance && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = value;
    }
  }

  return bestMatch;
}

/** Normalize location text by fuzzy matching against allowed values */
function normalizeLocationText(text: string, allowed: string[]): string {
  const words = text.toLowerCase().split(/\s+/);
  const normalizedWords: string[] = [];

  for (const word of words) {
    if (word.length < 5 || NON_LOCATION_WORDS.has(word)) {
      normalizedWords.push(word);
      continue;
    }

    const match = findBestLocationMatch(word, allowed);
    if (match) {
      normalizedWords.push(match);
    } else {
      normalizedWords.push(word);
    }
  }

  return normalizedWords.join(" ");
}

export function extractLocationsFromQuery(query: string): string[] {
  const locations = new Set<string>();
  
  // Build allowed locations list
  const allowedLocations: string[] = [REMOTE_LOCATION.value];
  for (const region of PERSON_LOCATION_REGIONS) {
    allowedLocations.push(region.value);
    for (const city of region.cities ?? []) {
      allowedLocations.push(city.value);
    }
    for (const state of region.states ?? []) {
      allowedLocations.push(state.value);
      for (const city of state.cities ?? []) {
        allowedLocations.push(city.value);
      }
    }
  }
  
  const normalizedQuery = normalizeLocationText(query, allowedLocations);

  for (const { pattern, values } of LOCATION_MULTI_PHRASES) {
    if (pattern.test(normalizedQuery)) {
      for (const value of values) locations.add(value);
    }
  }

  for (const { pattern, value } of LOCATION_PHRASES) {
    if (pattern.test(normalizedQuery)) locations.add(value);
  }

  for (const region of PERSON_LOCATION_REGIONS) {
    if (locationMentionedInText(normalizedQuery, region.value)) {
      locations.add(region.value);
    }

    for (const city of region.cities ?? []) {
      if (locationMentionedInText(normalizedQuery, city.value)) {
        locations.add(city.value);
      }
    }

    for (const state of region.states ?? []) {
      if (locationMentionedInText(normalizedQuery, state.value)) {
        locations.add(state.value);
      }

      for (const city of state.cities ?? []) {
        if (locationMentionedInText(normalizedQuery, city.value)) {
          locations.add(city.value);
        }
      }
    }
  }

  if (/\bremote\b/i.test(normalizedQuery)) {
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

  const lower = cleaned.toLowerCase();
  if (TITLE_INDUSTRY_ONLY.has(lower)) return undefined;
  if (!looksLikeRolePhrase(cleaned) && extractIndustriesFromQuery(cleaned).length > 0) {
    return undefined;
  }

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

/** Country/state each value sits under, so "Punjab Pakistan" keeps only the province. */
const LOCATION_ANCESTORS = new Map<string, string[]>();
for (const region of PERSON_LOCATION_REGIONS) {
  for (const city of region.cities ?? []) {
    LOCATION_ANCESTORS.set(city.value, [region.value]);
  }
  for (const state of region.states ?? []) {
    LOCATION_ANCESTORS.set(state.value, [region.value]);
    for (const city of state.cities ?? []) {
      LOCATION_ANCESTORS.set(city.value, [region.value, state.value]);
    }
  }
}

function preferSpecificLocations(locations: string[]): string[] {
  const coveredCountries = new Set(
    locations.flatMap((location) => LOCATION_ANCESTORS.get(location) ?? []),
  );

  // "Punjab, Pakistan" makes the same-named Indian province irrelevant.
  const qualifiedNames = new Set(
    locations
      .filter((location) => location.includes(","))
      .map((location) => location.split(",")[0].trim().toLowerCase()),
  );

  return locations.filter(
    (location) =>
      !coveredCountries.has(location) &&
      !(!location.includes(",") && qualifiedNames.has(location.toLowerCase())),
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

  const extractedRevenue = extractAnnualRevenueFromQuery(query);
  if (extractedRevenue) {
    refined.annualRevenue = extractedRevenue.label;
    if (typeof extractedRevenue.min === "number") {
      refined.annualRevenueMin = extractedRevenue.min;
    } else {
      delete refined.annualRevenueMin;
    }
    if (typeof extractedRevenue.max === "number") {
      refined.annualRevenueMax = extractedRevenue.max;
    } else {
      delete refined.annualRevenueMax;
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
