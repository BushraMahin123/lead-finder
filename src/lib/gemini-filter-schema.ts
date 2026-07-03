import {
  COMPANY_TYPE_OPTIONS,
  DEPARTMENT_OPTIONS,
  EMPLOYEE_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
  LANGUAGE_OPTIONS,
  SENIORITY_OPTIONS,
  normalizeEmployeeSizeValues,
} from "@/lib/filter-options";
import {
  PERSON_LOCATION_REGIONS,
  REMOTE_LOCATION,
  allValuesInRegion,
} from "@/lib/location-regions";
import type { SearchFilters } from "@/types/lead";

const PERSON_LOCATIONS = [
  ...PERSON_LOCATION_REGIONS.flatMap(allValuesInRegion),
  REMOTE_LOCATION.value,
];

function optionsPrompt(options: { value: string; label: string }[]) {
  return options.map((option) => `${option.value} (${option.label})`).join(", ");
}

export function buildGeminiSystemPrompt(): string {
  return `You convert natural-language B2B lead search requests into structured search filters.

Return ONLY valid JSON matching this shape (use null for unused string fields, [] for unused arrays):
{
  "jobTitle": string | null,
  "companyName": string | null,
  "companyDomain": string | null,
  "keywords": string | null,
  "personName": string | null,
  "skills": string | null,
  "linkedInUrls": string | null,
  "linkedInBadge": string | null,
  "funding": string | null,
  "technology": string | null,
  "annualRevenue": string | null,
  "productsServices": string | null,
  "education": string | null,
  "socialMedia": string | null,
  "certifications": string | null,
  "foundedYear": string | null,
  "headcountGrowth": string | null,
  "locations": string[],
  "companyLocations": string[],
  "industries": string[],
  "seniorities": string[],
  "departments": string[],
  "employeeSizes": string[],
  "languages": string[],
  "companyTypes": string[]
}

Rules:
- Extract as many relevant filters as possible from the user text.
- jobTitle must contain ONLY the person's role/title (e.g. "VP of Sales"). Never include company type, industry, location, or employee count in jobTitle.
- If the query says "VP of Sales at SaaS companies with 1-50 employees", jobTitle should be "VP of Sales" only.
- Map SaaS / software companies to industries=["software development"], not into jobTitle or keywords.
- Map employee count phrases to employeeSizes using exact allowed values. Examples:
  - "1-50 employees" -> ["1-10", "11-50"]
  - "1-100 employees" -> ["1-10", "11-50", "51-200"]
  - "50-500 employees" -> ["51-200", "201-500"]
  - "200 employees" or "201-500" -> matching bucket only
- Custom ranges like "1-100" are valid in employeeSizes when no exact bucket exists; they will be normalized automatically.
- Do not put numeric ranges like "1-50" or "-50" into keywords.
- keywords should only include extra topical terms that are not already captured by jobTitle, industry, location, or employeeSizes.
- For list fields, ONLY use exact "value" strings from the allowed lists below.
- locations and companyLocations must use exact location values from the allowed location list.
- Prefer specific job titles, company names, and domains when mentioned.
- Put remaining topical terms in skills or technology only when they are clearly skills/tools.
- If the user mentions LinkedIn profile URLs, put them newline-separated in linkedInUrls.
- Do not invent filters that are not implied by the query.
- At least one filter field must be non-empty.

Examples:
Query: "VP of Sales at SaaS companies with 1-100 employees"
{
  "jobTitle": "VP of Sales",
  "industries": ["software development"],
  "employeeSizes": ["1-10", "11-50", "51-200"],
  "keywords": null
}

Query: "VP of Sales at SaaS companies with 1-50 employees"
{
  "jobTitle": "VP of Sales",
  "industries": ["software development"],
  "employeeSizes": ["1-10", "11-50"],
  "keywords": null
}

Query: "Marketing directors in the US at fintech startups with 51-200 employees"
{
  "jobTitle": "Marketing Director",
  "locations": ["United States"],
  "industries": ["financial services"],
  "employeeSizes": ["51-200"],
  "keywords": null
}

Allowed seniorities: ${optionsPrompt(SENIORITY_OPTIONS)}
Allowed departments: ${optionsPrompt(DEPARTMENT_OPTIONS)}
Allowed industries: ${optionsPrompt(INDUSTRY_OPTIONS)}
Allowed employeeSizes: ${optionsPrompt(EMPLOYEE_SIZE_OPTIONS)}
Allowed languages: ${optionsPrompt(LANGUAGE_OPTIONS)}
Allowed companyTypes: ${optionsPrompt(COMPANY_TYPE_OPTIONS)}
Allowed locations: ${PERSON_LOCATIONS.join(", ")}`;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickAllowed(values: string[], allowed: string[]): string[] {
  const allowedMap = new Map(
    allowed.map((value) => [value.toLowerCase(), value]),
  );

  return [...new Set(
    values
      .map((value) => allowedMap.get(value.toLowerCase()) ?? null)
      .filter((value): value is string => Boolean(value)),
  )];
}

function pickLocations(values: string[]): string[] {
  return pickAllowed(values, PERSON_LOCATIONS);
}

export function normalizeGeminiFilters(
  raw: Record<string, unknown>,
): Partial<SearchFilters> {
  const linkedInUrls = cleanString(raw.linkedInUrls);
  const normalizedEmployees = normalizeEmployeeSizeValues(
    cleanStringArray(raw.employeeSizes),
  );

  const filters: Partial<SearchFilters> = {
    jobTitle: cleanString(raw.jobTitle),
    companyName: cleanString(raw.companyName),
    companyDomain: cleanString(raw.companyDomain),
    keywords: cleanString(raw.keywords),
    personName: cleanString(raw.personName),
    skills: cleanString(raw.skills),
    linkedInUrls,
    linkedInBadge: cleanString(raw.linkedInBadge),
    funding: cleanString(raw.funding),
    technology: cleanString(raw.technology),
    annualRevenue: cleanString(raw.annualRevenue),
    productsServices: cleanString(raw.productsServices),
    education: cleanString(raw.education),
    socialMedia: cleanString(raw.socialMedia),
    certifications: cleanString(raw.certifications),
    foundedYear: cleanString(raw.foundedYear),
    headcountGrowth: cleanString(raw.headcountGrowth),
    locations: pickLocations(cleanStringArray(raw.locations)),
    companyLocations: pickLocations(cleanStringArray(raw.companyLocations)),
    industries: pickAllowed(
      cleanStringArray(raw.industries),
      INDUSTRY_OPTIONS.map((option) => option.value),
    ),
    seniorities: pickAllowed(
      cleanStringArray(raw.seniorities),
      SENIORITY_OPTIONS.map((option) => option.value),
    ),
    departments: pickAllowed(
      cleanStringArray(raw.departments),
      DEPARTMENT_OPTIONS.map((option) => option.value),
    ),
    employeeSizes: normalizedEmployees.buckets,
    ...(normalizedEmployees.customRange
      ? {
          employeeCountMin: normalizedEmployees.customRange.start,
          employeeCountMax: normalizedEmployees.customRange.end,
        }
      : {}),
    languages: pickAllowed(
      cleanStringArray(raw.languages),
      LANGUAGE_OPTIONS.map((option) => option.value),
    ),
    companyTypes: pickAllowed(
      cleanStringArray(raw.companyTypes),
      COMPANY_TYPE_OPTIONS.map((option) => option.value),
    ),
    searchMode: linkedInUrls ? "linkedin" : "people",
    page: 1,
    perPage: 20,
  };

  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== "";
    }),
  ) as Partial<SearchFilters>;
}

export function hasAnySearchFilters(filters: Partial<SearchFilters>): boolean {
  return Boolean(
    filters.linkedInUrls?.trim() ||
      filters.jobTitle?.trim() ||
      filters.companyName?.trim() ||
      filters.companyDomain?.trim() ||
      filters.keywords?.trim() ||
      filters.personName?.trim() ||
      filters.skills?.trim() ||
      filters.linkedInBadge?.trim() ||
      filters.funding?.trim() ||
      filters.technology?.trim() ||
      filters.annualRevenue?.trim() ||
      filters.productsServices?.trim() ||
      filters.education?.trim() ||
      filters.socialMedia?.trim() ||
      filters.certifications?.trim() ||
      filters.foundedYear?.trim() ||
      filters.headcountGrowth?.trim() ||
      filters.locations?.length ||
      filters.companyLocations?.length ||
      filters.industries?.length ||
      filters.seniorities?.length ||
      filters.departments?.length ||
      filters.employeeSizes?.length ||
      (typeof filters.employeeCountMin === "number" &&
        typeof filters.employeeCountMax === "number") ||
      filters.languages?.length ||
      filters.companyTypes?.length,
  );
}
