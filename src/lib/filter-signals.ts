import type { SearchFilters } from "@/types/lead";

/**
 * Maps free-form query language → required SearchFilters fields.
 * If a signal matches the query but none of its fields are filled,
 * rule-based parsing is NOT sufficient — Gemini must run.
 */
export type FilterSignal = {
  id: string;
  /** Human label for debugging / warnings */
  label: string;
  /** True when the query is asking for this filter dimension */
  detect: (query: string) => boolean;
  /** True when filters already satisfy that dimension */
  isSatisfied: (filters: Partial<SearchFilters>) => boolean;
};

function hasText(value?: string): boolean {
  return Boolean(value?.trim());
}

function hasList(values?: string[]): boolean {
  return Boolean(values?.length);
}

export const FILTER_SIGNALS: FilterSignal[] = [
  {
    id: "jobTitle",
    label: "Job title",
    detect: (query) =>
      /\b(?:ceo|cfo|cto|coo|cmo|founder|director|manager|engineer|scientist|marketer|designer|analyst|vp|vice\s+president|head\s+of|owner|partner)\b/i.test(
        query,
      ) ||
      /\b[a-z][a-z0-9&/-]*(?:\s+[a-z][a-z0-9&/-]*){0,3}\s+(?:in|at|from|near|working\s+at|based\s+in)\b/i.test(
        query,
      ),
    isSatisfied: (f) => hasText(f.jobTitle),
  },
  {
    id: "location",
    label: "Location",
    detect: (query) =>
      /\b(?:in|from|based\s+in|located\s+in|living\s+in)\s+[a-z]/i.test(query) ||
      /\b(?:united\s+states|canada|california|texas|new\s*york|london|remote|uk|uae)\b/i.test(
        query,
      ),
    isSatisfied: (f) => hasList(f.locations) || hasList(f.companyLocations),
  },
  {
    id: "industry",
    label: "Industry",
    detect: (query) =>
      /\b(?:saas|fintech|healthcare|e[\s-]?commerce|ecommerce|software\s+compan|retail|consulting|b2b|b2c)\b/i.test(
        query,
      ),
    isSatisfied: (f) => hasList(f.industries) || hasText(f.keywords),
  },
  {
    id: "companySize",
    label: "Company size",
    detect: (query) =>
      /\b(?:employees?|headcount|company\s+size|staff\s+size)\b/i.test(query) ||
      /\b(?:over|more\s+than|above|at\s+least|under|less\s+than|fewer\s+than)\s+\d[\d,]*\s+employees?\b/i.test(
        query,
      ),
    isSatisfied: (f) =>
      hasList(f.employeeSizes) ||
      (typeof f.employeeCountMin === "number" &&
        typeof f.employeeCountMax === "number"),
  },
  {
    id: "experience",
    label: "Years of experience",
    detect: (query) =>
      /\b(?:years?(?:\s+of)?(?:\s+[a-z][\w\s&/-]{0,40})?\s+experience|\d+\s*\+\s*years?)\b/i.test(
        query,
      ),
    isSatisfied: (f) =>
      typeof f.experienceYearsMin === "number" ||
      typeof f.experienceYearsMax === "number",
  },
  {
    id: "annualRevenue",
    label: "Annual revenue",
    detect: (query) =>
      /\b(?:annual\s+)?revenue\b|\b(?:arr|revenue)\b.*\$|\b\$\s?\d|\b\d+\s*(?:million|billion|m|b)\b/i.test(
        query,
      ),
    isSatisfied: (f) =>
      hasText(f.annualRevenue) ||
      typeof f.annualRevenueMin === "number" ||
      typeof f.annualRevenueMax === "number",
  },
  {
    id: "funding",
    label: "Funding",
    detect: (query) =>
      /\b(?:funding|funded|series\s+[a-d]|seed\s+round|venture|raised)\b/i.test(
        query,
      ),
    isSatisfied: (f) => hasText(f.funding),
  },
  {
    id: "companyName",
    label: "Company name",
    detect: (query) =>
      /\b(?:at|for|from)\s+[A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,2}\b/.test(
        query,
      ) && !/\b(?:at|for)\s+(?:saas|b2b|companies|startups)\b/i.test(query),
    isSatisfied: (f) => hasText(f.companyName) || hasText(f.companyDomain),
  },
  {
    id: "seniority",
    label: "Seniority",
    detect: (query) =>
      /\b(?:senior|junior|entry[\s-]?level|mid[\s-]?level|c[\s-]?level|c[\s-]?suite|vp|director|intern)\b/i.test(
        query,
      ),
    isSatisfied: (f) => hasList(f.seniorities) || hasText(f.jobTitle),
  },
  {
    id: "department",
    label: "Department",
    detect: (query) =>
      /\b(?:in\s+the\s+)?(?:sales|marketing|engineering|design|finance|hr|legal|operations)\s+department\b/i.test(
        query,
      ),
    isSatisfied: (f) => hasList(f.departments),
  },
  {
    id: "skills",
    label: "Skills",
    detect: (query) =>
      /\b(?:skills?|proficient\s+in|experience\s+(?:with|in)\s+[a-z]|years?\s+of\s+[a-z][\w\s&/-]+\s+experience)\b/i.test(
        query,
      ),
    isSatisfied: (f) => hasText(f.skills) || hasText(f.technology),
  },
  {
    id: "technology",
    label: "Technology",
    detect: (query) =>
      /\b(?:tech\s+stack|using\s+|built\s+on|technologies?|aws|azure|salesforce|hubspot)\b/i.test(
        query,
      ),
    isSatisfied: (f) => hasText(f.technology) || hasText(f.skills),
  },
  {
    id: "companyType",
    label: "Company type",
    detect: (query) =>
      /\b(?:public\s+compan|private(?:ly)?\s+held|non[\s-]?profit|government|startup|agency)\b/i.test(
        query,
      ),
    isSatisfied: (f) => hasList(f.companyTypes) || hasText(f.keywords),
  },
  {
    id: "keywords",
    label: "Keywords",
    detect: (query) => /\b(?:b2b|b2c|enterprise|smb|startup)\b/i.test(query),
    isSatisfied: (f) => hasText(f.keywords) || hasList(f.industries),
  },
];

export function getUnsatisfiedFilterSignals(
  query: string,
  filters: Partial<SearchFilters>,
): FilterSignal[] {
  return FILTER_SIGNALS.filter(
    (signal) => signal.detect(query) && !signal.isSatisfied(filters),
  );
}

export function countSatisfiedFilterSignals(
  query: string,
  filters: Partial<SearchFilters>,
): number {
  return FILTER_SIGNALS.filter(
    (signal) => signal.detect(query) && signal.isSatisfied(filters),
  ).length;
}
