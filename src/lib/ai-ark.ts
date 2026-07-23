import { parseEmployeeSizeRange } from "@/lib/filter-options";
import { filterPeopleBySearchFilters } from "@/lib/filter-result-match";
import {
  enqueueAiArk,
  isRetryableHttpStatus,
  RetryableQueueError,
} from "@/lib/api-queue";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import type { LeadPerson, SearchFilters } from "@/types/lead";

const AI_ARK_API = "https://api.ai-ark.com/api/developer-portal";

interface AiArkPerson {
  id: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    title?: string;
  };
  link?: {
    linkedin?: string;
  };
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  industry?: string;
  department?: {
    departments?: string[];
    seniority?: string;
  };
  position_groups?: Array<{
    company?: {
      name?: string;
      url?: string;
    };
  }>;
  company?: {
    summary?: {
      name?: string;
      industry?: string;
      staff?: { total?: number };
    };
    link?: {
      website?: string;
      domain?: string;
    };
    location?: {
      headquarter?: {
        city?: string;
        country?: string;
      };
    };
  };
}

interface AiArkSearchResponse {
  content?: AiArkPerson[];
  totalElements?: number;
}

interface AiArkEmailOutput {
  address?: string;
  status?: string;
}

function getApiKey(): string {
  const key = process.env.AI_ARK_API_KEY;
  if (!key) {
    throw new Error(
      "Search is not configured. Contact your administrator.",
    );
  }
  return key;
}

function formatAiArkError(
  status: number,
  data: Record<string, unknown>,
): string {
  const parts: string[] = [];
  const error = data.error as string | undefined;
  const message = data.message as string | undefined;

  if (error) parts.push(error);
  if (message && message !== error) parts.push(message);

  if (parts.length > 0) {
    return `Search error (${status}): ${parts.join(" — ")}`;
  }

  return `Search request failed (${status})`;
}

async function arkRequest(
  path: string,
  options: RequestInit = {},
): Promise<{ response: Response; data: Record<string, unknown> }> {
  return enqueueAiArk(async () => {
    const response = await fetch(`${AI_ARK_API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-TOKEN": getApiKey(),
        ...options.headers,
      },
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};

    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new Error(
          `Search returned an invalid response (${response.status}).`,
        );
      }
    }

    if (isRetryableHttpStatus(response.status)) {
      throw new RetryableQueueError(
        formatAiArkError(response.status, data),
        response.status,
      );
    }

    return { response, data };
  });
}

async function arkFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { response, data } = await arkRequest(path, options);

  if (!response.ok) {
    console.error("[ai-ark]", path, response.status, data);
    if (response.status === 404) {
      throw new Error("No results found for this search.");
    }
    throw new Error(formatAiArkError(response.status, data));
  }

  return data as T;
}

function splitCsv(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

function smartTextFilter(values: string[], mode: "SMART" | "WORD" | "STRICT" = "SMART") {
  return {
    any: {
      include: {
        mode,
        content: values,
      },
    },
  };
}

function titleSearchVariants(title: string): string[] {
  const trimmed = title.trim();
  if (!trimmed) return [];

  const variants = new Set<string>([trimmed]);
  const singular = trimmed
    .replace(/\bmanagers\b/gi, "Manager")
    .replace(/\bdirectors\b/gi, "Director")
    .replace(/\bengineers\b/gi, "Engineer")
    .replace(/\bscientists\b/gi, "Scientist")
    .replace(/\banalysts\b/gi, "Analyst")
    .replace(/\bmarketers\b/gi, "Marketer")
    .replace(/\bdesigners\b/gi, "Designer")
    .replace(/\bdevelopers\b/gi, "Developer")
    .replace(/\bowners\b/gi, "Owner")
    .replace(/\bfounders\b/gi, "Founder");

  if (singular !== trimmed) {
    variants.add(singular);
  }

  return [...variants];
}

function anyInclude(values: string[]) {
  return {
    any: {
      include: values,
    },
  };
}

function peopleKeywordFilter(values: string[]) {
  return {
    any: {
      include: {
        sources: [
          { mode: "SMART", source: "HEADLINE" },
          { mode: "SMART", source: "SUMMARY" },
          { mode: "SMART", source: "ORGANIZATION" },
          { mode: "WORD", source: "SKILL" },
        ],
        content: values,
      },
    },
  };
}

function normalizeLinkedInUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.includes("linkedin.com/in/")) return null;

  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    if (!url.hostname.includes("linkedin.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseLinkedInUrls(raw?: string): string[] {
  return (raw ?? "")
    .split(/\r?\n/)
    .map((url) => normalizeLinkedInUrl(url))
    .filter((url): url is string => Boolean(url))
    .slice(0, 10);
}

function inferSearchMode(filters: SearchFilters) {
  if (filters.searchMode) return filters.searchMode;
  if (filters.linkedInUrls?.trim()) return "linkedin" as const;
  return "people" as const;
}

function hasValues(values?: string[]): boolean {
  return Boolean(values?.some((value) => value.trim()));
}

function hasPeopleFilters(filters: SearchFilters): boolean {
  return Boolean(
    filters.jobTitle?.trim() ||
      hasValues(filters.locations) ||
      hasValues(filters.companyLocations) ||
      filters.keywords?.trim() ||
      filters.personName?.trim() ||
      filters.skills?.trim() ||
      filters.technology?.trim() ||
      filters.productsServices?.trim() ||
      filters.education?.trim() ||
      filters.socialMedia?.trim() ||
      filters.certifications?.trim() ||
      filters.funding?.trim() ||
      filters.annualRevenue?.trim() ||
      filters.foundedYear?.trim() ||
      filters.headcountGrowth?.trim() ||
      filters.linkedInBadge?.trim() ||
      filters.companyName?.trim() ||
      filters.companyDomain?.trim() ||
      hasValues(filters.industries) ||
      hasValues(filters.seniorities) ||
      hasValues(filters.departments) ||
      hasValues(filters.employeeSizes) ||
      (typeof filters.employeeCountMin === "number" &&
        typeof filters.employeeCountMax === "number") ||
      typeof filters.experienceYearsMin === "number" ||
      typeof filters.experienceYearsMax === "number" ||
      typeof filters.annualRevenueMin === "number" ||
      typeof filters.annualRevenueMax === "number" ||
      hasValues(filters.languages) ||
      hasValues(filters.companyTypes),
  );
}

function buildSearchBody(filters: SearchFilters): Record<string, unknown> {
  const page = Math.max(0, (filters.page ?? 1) - 1);
  const size = Math.min(filters.perPage ?? SEARCH_RESULTS_PER_PAGE, 100);

  const account: Record<string, unknown> = {};
  const contact: Record<string, unknown> = {};

  const domains = splitCsv(filters.companyDomain).map(normalizeDomain);
  if (domains.length > 0) {
    account.domain = anyInclude(domains);
  }

  const companyNames = splitCsv(filters.companyName);
  if (companyNames.length > 0) {
    account.name = smartTextFilter(companyNames);
  }

  const industries = (filters.industries ?? []).map((v) => v.trim()).filter(Boolean);
  if (industries.length > 0) {
    account.industries = {
      any: {
        include: {
          mode: "WORD",
          content: industries,
        },
      },
    };
  }

  const companyLocations = (filters.companyLocations ?? [])
    .map((v) => v.trim())
    .filter(Boolean);
  if (companyLocations.length > 0) {
    account.location = anyInclude(companyLocations);
  }

  const employeeRanges = (filters.employeeSizes ?? [])
    .map(parseEmployeeSizeRange)
    .filter((range): range is { start: number; end: number } => Boolean(range));

  const hasCustomEmployeeRange =
    typeof filters.employeeCountMin === "number" &&
    typeof filters.employeeCountMax === "number" &&
    filters.employeeCountMax >= filters.employeeCountMin;

  if (hasCustomEmployeeRange) {
    account.employeeSize = {
      type: "RANGE",
      range: [
        {
          start: filters.employeeCountMin,
          end: filters.employeeCountMax,
        },
      ],
    };
  } else if (employeeRanges.length > 0) {
    account.employeeSize = {
      type: "RANGE",
      range: employeeRanges,
    };
  }

  const companyTypes = (filters.companyTypes ?? [])
    .map((v) => v.trim())
    .filter(Boolean);
  if (companyTypes.length > 0) {
    account.type = anyInclude(companyTypes);
  }

  const hasRevenueRange =
    typeof filters.annualRevenueMin === "number" ||
    typeof filters.annualRevenueMax === "number";
  if (hasRevenueRange) {
    const start = filters.annualRevenueMin ?? 0;
    const end = filters.annualRevenueMax ?? 100_000_000_000;
    account.revenue = {
      type: "RANGE",
      range: [{ start, end }],
    };
  }

  const titles = splitCsv(filters.jobTitle).flatMap(titleSearchVariants);
  const hasExperienceYears =
    typeof filters.experienceYearsMin === "number" ||
    typeof filters.experienceYearsMax === "number";

  if (titles.length > 0 || hasExperienceYears) {
    const current: Record<string, unknown> = {};

    if (titles.length > 0) {
      // WORD is stricter than SMART — reduces unrelated title matches from the provider.
      current.title = smartTextFilter([...new Set(titles)], "WORD");
    }

    if (hasExperienceYears) {
      const minYear = filters.experienceYearsMin ?? 0;
      const maxYear = filters.experienceYearsMax ?? 50;
      current.duration = {
        total: {
          min: { year: minYear, month: 0 },
          max: { year: Math.max(maxYear, minYear), month: 0 },
        },
      };
    }

    contact.experience = { current };
  }

  const locations = (filters.locations ?? []).map((v) => v.trim()).filter(Boolean);
  if (locations.length > 0) {
    contact.location = anyInclude(locations);
  }

  const seniorities = (filters.seniorities ?? [])
    .map((v) => v.trim())
    .filter(Boolean);
  if (seniorities.length > 0) {
    contact.seniority = anyInclude(seniorities);
  }

  const departments = (filters.departments ?? [])
    .map((v) => v.trim())
    .filter(Boolean);
  if (departments.length > 0) {
    contact.departmentAndFunction = anyInclude(departments);
  }

  const languages = (filters.languages ?? []).map((v) => v.trim()).filter(Boolean);
  if (languages.length > 0) {
    contact.language = {
      any: {
        include: {
          mode: "SMART",
          content: languages,
        },
      },
    };
  }

  const parts: string[] = [];
  if (filters.personName?.trim()) parts.push(filters.personName.trim());
  if (filters.skills?.trim()) parts.push(filters.skills.trim());
  if (filters.technology?.trim()) parts.push(filters.technology.trim());
  if (filters.productsServices?.trim()) parts.push(filters.productsServices.trim());
  if (filters.education?.trim()) parts.push(filters.education.trim());
  if (filters.socialMedia?.trim()) parts.push(filters.socialMedia.trim());
  if (filters.certifications?.trim()) parts.push(filters.certifications.trim());
  if (filters.funding?.trim()) parts.push(filters.funding.trim());
  // annualRevenue is applied via account.revenue when min/max exist; keep label out of keywords.
  if (
    filters.annualRevenue?.trim() &&
    typeof filters.annualRevenueMin !== "number" &&
    typeof filters.annualRevenueMax !== "number"
  ) {
    parts.push(filters.annualRevenue.trim());
  }
  if (filters.foundedYear?.trim()) parts.push(filters.foundedYear.trim());
  if (filters.headcountGrowth?.trim()) parts.push(filters.headcountGrowth.trim());
  if (filters.linkedInBadge?.trim()) parts.push(filters.linkedInBadge.trim());

  const keywords = [...splitCsv(filters.keywords), ...parts]
    .map((value) => value.trim())
    .filter(Boolean);
  if (keywords.length > 0) {
    contact.keyword = peopleKeywordFilter([...new Set(keywords)]);
  }

  const linkedInUrls = parseLinkedInUrls(filters.linkedInUrls);
  if (linkedInUrls.length > 0) {
    contact.linkedin = anyInclude(linkedInUrls);
  }

  const body: Record<string, unknown> = { page, size };
  if (Object.keys(account).length > 0) body.account = account;
  if (Object.keys(contact).length > 0) body.contact = contact;

  return body;
}

function mapPersonToLead(person: AiArkPerson): LeadPerson {
  const company = person.company;
  const positionGroup = person.position_groups?.[0];

  return {
    id: person.id,
    first_name: person.profile?.first_name,
    last_name: person.profile?.last_name,
    name: person.profile?.full_name,
    title: person.profile?.title,
    linkedin_url: person.link?.linkedin,
    city: person.location?.city,
    state: person.location?.state,
    country: person.location?.country,
    seniority: person.department?.seniority,
    departments: person.department?.departments,
    organization: {
      name: company?.summary?.name ?? positionGroup?.company?.name,
      primary_domain: company?.link?.domain,
      website_url: company?.link?.website ?? positionGroup?.company?.url,
      industry: company?.summary?.industry ?? person.industry,
      estimated_num_employees: company?.summary?.staff?.total,
      city: company?.location?.headquarter?.city,
      country: company?.location?.headquarter?.country,
    },
  };
}

async function enrichEmail(
  person: AiArkPerson,
): Promise<{ email?: string; status?: string }> {
  try {
    const body: Record<string, string> = { id: person.id };
    if (person.link?.linkedin) {
      body.url = person.link.linkedin;
    }

    const data = await arkFetch<{
      email?: { output?: AiArkEmailOutput[] };
    }>("/v1/people/export/single", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const first = data.email?.output?.[0];
    return { email: first?.address, status: first?.status };
  } catch {
    return {};
  }
}

async function enrichPhone(
  person: AiArkPerson,
): Promise<string | undefined> {
  const linkedin = person.link?.linkedin;
  if (!linkedin) return undefined;

  try {
    const data = await arkFetch<{
      data?: string[][];
    }>("/v1/people/mobile-phone-finder", {
      method: "POST",
      body: JSON.stringify({ linkedin }),
    });

    return data.data?.[0]?.[0];
  } catch {
    return undefined;
  }
}

async function enrichPeople(
  people: LeadPerson[],
  sourcePeople: AiArkPerson[],
  filters: SearchFilters,
): Promise<LeadPerson[]> {
  if (!filters.enrichContacts) return people;

  const limit = Math.min(people.length, 5);
  const enrichResults = await Promise.all(
    sourcePeople.slice(0, limit).map(async (person, index) => {
      const [emailResult, phone] = await Promise.all([
        enrichEmail(person),
        enrichPhone(person),
      ]);

      return {
        index,
        email: emailResult.email,
        emailStatus: emailResult.status,
        phone,
      };
    }),
  );

  return people.map((lead, index) => {
    const enriched = enrichResults.find((result) => result.index === index);
    if (!enriched) return lead;

    const phoneNumbers = enriched.phone
      ? [{ sanitized_number: enriched.phone, type: "mobile" }]
      : lead.phone_numbers;

    return {
      ...lead,
      email: enriched.email ?? lead.email,
      email_status: enriched.emailStatus ?? lead.email_status,
      phone_numbers: phoneNumbers,
    };
  });
}

export async function searchPeople(
  filters: SearchFilters,
): Promise<{ people: LeadPerson[]; totalEntries: number }> {
  const mode = inferSearchMode(filters);

  if (mode === "linkedin") {
    const urls = parseLinkedInUrls(filters.linkedInUrls);
    if (urls.length === 0) {
      throw new Error(
        "Add valid LinkedIn profile URLs (e.g. https://www.linkedin.com/in/username/).",
      );
    }
  } else if (!hasPeopleFilters(filters)) {
    throw new Error(
      "Add at least one filter — job title, location, keywords, company, industry, or seniority.",
    );
  }

  const body = buildSearchBody(filters);
  const result = await arkFetch<AiArkSearchResponse>("/v1/people", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const sourcePeople = result.content ?? [];
  const people = sourcePeople.map(mapPersonToLead);
  const matched = filterPeopleBySearchFilters(people, filters);
  const matchedIds = new Set(matched.map((person) => person.id));
  const matchedSources = sourcePeople.filter((person) =>
    matchedIds.has(person.id),
  );
  const enriched = await enrichPeople(matched, matchedSources, filters);

  // If we dropped mismatches, shrink total so pagination reflects what we can show.
  const providerTotal = result.totalElements ?? people.length;
  const dropped = people.length - matched.length;
  const totalEntries =
    dropped > 0
      ? Math.max(matched.length, providerTotal - dropped)
      : providerTotal;

  return {
    people: enriched,
    totalEntries,
  };
}
