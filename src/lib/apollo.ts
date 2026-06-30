import type { LeadPerson, SearchFilters } from "@/types/lead";

const APOLLO_BASE = "https://api.apollo.io/api/v1";

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key) {
    throw new Error(
      "APOLLO_API_KEY is not set. Add it to .env.local (get a free key at apollo.io).",
    );
  }
  return key;
}

function appendArrayParam(
  params: URLSearchParams,
  key: string,
  values: string[],
) {
  for (const value of values) {
    if (value.trim()) {
      params.append(`${key}[]`, value.trim());
    }
  }
}

function splitCsv(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function searchPeople(
  filters: SearchFilters,
): Promise<{ people: LeadPerson[]; totalEntries: number }> {
  const params = new URLSearchParams();
  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 25, 100);

  params.set("page", String(page));
  params.set("per_page", String(perPage));

  if (filters.keywords?.trim()) {
    params.set("q_keywords", filters.keywords.trim());
  }

  appendArrayParam(params, "person_titles", splitCsv(filters.jobTitle));
  appendArrayParam(params, "person_locations", splitCsv(filters.location));
  appendArrayParam(
    params,
    "q_organization_domains_list",
    splitCsv(filters.companyDomain),
  );

  if (filters.industry?.trim()) {
    appendArrayParam(
      params,
      "q_organization_keyword_tags",
      splitCsv(filters.industry),
    );
  }

  if (filters.seniority?.trim()) {
    appendArrayParam(params, "person_seniorities", splitCsv(filters.seniority));
  }

  const response = await fetch(
    `${APOLLO_BASE}/mixed_people/api_search?${params.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        accept: "application/json",
        "x-api-key": getApiKey(),
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Apollo search failed (${response.status})`;
    throw new Error(message);
  }

  const people = (data.people ?? []) as LeadPerson[];
  const totalEntries = data.pagination?.total_entries ?? data.total_entries ?? 0;

  return { people, totalEntries };
}

export async function enrichPerson(personId: string): Promise<LeadPerson | null> {
  const response = await fetch(`${APOLLO_BASE}/people/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      accept: "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({ id: personId }),
  });

  const data = await response.json();

  if (!response.ok) {
    return null;
  }

  return (data.person ?? null) as LeadPerson | null;
}

export async function enrichPeople(
  people: LeadPerson[],
  limit = 10,
): Promise<LeadPerson[]> {
  const toEnrich = people
    .filter((person) => person.has_email !== false)
    .slice(0, limit);

  const enriched = await Promise.all(
    toEnrich.map(async (person) => {
      const match = await enrichPerson(person.id);
      return match ? { ...person, ...match } : person;
    }),
  );

  const enrichedById = new Map(enriched.map((person) => [person.id, person]));

  return people.map((person) => enrichedById.get(person.id) ?? person);
}
