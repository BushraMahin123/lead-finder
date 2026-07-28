/**
 * Generates filter option lists, catalog metadata, and location regions
 * from lead-search-filters.json (alphabetically sorted).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "lead-search-filters.json");
const outDir = path.join(root, "src", "lib", "generated");

const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const FILTER_ID_MAP = {
  "people-search-name": "personName",
  "linkedin-profile-url": "linkedInUrl",
  "company-name": "companyName",
  "company-domain": "domain",
  industry: "industry",
  "job-title": "jobTitle",
  seniority: "seniority",
  location: "location",
  keywords: "keywords",
  skills: "skills",
  "linkedin-profile-badge": "linkedInBadge",
  "company-type": "companyType",
  funding: "funding",
  technology: "technology",
  "annual-revenue": "annualRevenue",
  employees: "employees",
  "products-services": "productsServices",
  education: "education",
  "social-media": "socialMedia",
  certifications: "certifications",
  "spoken-languages": "languages",
  "founded-year": "foundedYear",
  "headcount-growth": "headcountGrowth",
  "employees-by-department": "employeesDepartment",
};

function sortByLabel(a, b) {
  return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
}

function sortByName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function normalizeOption(raw) {
  if (typeof raw === "string") {
    return { label: raw, value: raw };
  }
  if (raw && typeof raw === "object") {
    const label = raw.label ?? String(raw.value ?? "");
    let value = raw.value;
    if (value && typeof value === "object" && "start" in value) {
      value =
        "end" in value && value.end != null
          ? `${value.start}-${value.end}`
          : `${value.start}+`;
    }
    return { label, value: String(value ?? label) };
  }
  return null;
}

function normalizeOptions(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(normalizeOption)
    .filter(Boolean)
    .sort(sortByLabel);
}

function getFilterById(id) {
  return data.filters.find((f) => f.id === id);
}

function buildRangeMeta(options) {
  return (options ?? []).map((opt) => {
    const value = opt.value;
    if (value && typeof value === "object" && "start" in value) {
      const end =
        "end" in value && value.end != null
          ? value.end
          : Number.MAX_SAFE_INTEGER;
      const valueKey =
        end === Number.MAX_SAFE_INTEGER
          ? `${value.start}+`
          : `${value.start}-${end}`;
      return {
        label: opt.label,
        value: valueKey,
        start: value.start,
        end,
      };
    }
    return normalizeOption(opt);
  }).sort(sortByLabel);
}

// --- Location regions from tree ---
function buildLocationRegions() {
  const loc = getFilterById("location");
  const tree = loc?.options?.tree ?? [];
  /** @type {Map<string, { value: string; label: string; states?: { value: string; label: string }[] }>} */
  const byCountry = new Map();

  for (const continent of tree) {
    for (const country of continent.countries ?? []) {
      const existing = byCountry.get(country.name);
      const stateNames = [...new Set(country.states ?? [])];

      if (existing) {
        const mergedStates = new Set([
          ...(existing.states?.map((state) => state.value) ?? []),
          ...stateNames,
        ]);
        if (mergedStates.size > 0) {
          existing.states = [...mergedStates]
            .sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: "base" }),
            )
            .map((name) => ({ value: name, label: name }));
        }
        continue;
      }

      const states = stateNames
        .map((name) => ({ value: name, label: name }))
        .sort(sortByLabel);

      byCountry.set(country.name, {
        value: country.name,
        label: country.name,
        ...(states.length > 0 ? { states } : {}),
      });
    }
  }

  return [...byCountry.values()].sort(sortByLabel);
}

// --- Catalog ---
const sortedFilters = [...data.filters].sort(sortByName);

const catalogEntries = sortedFilters.map((filter) => {
  const subFilters = (filter.subFilters ?? [])
    .map((sf) => ({
      id: sf.id,
      name: sf.name,
      formFields: sf.formFields ?? [],
      options: normalizeOptions(sf.options ?? sf.presetOptions),
      fields: sf.fields ?? [],
      maxItems: sf.maxItems ?? null,
      type: sf.type ?? null,
    }))
    .sort(sortByName);

  return {
    jsonId: filter.id,
    id: FILTER_ID_MAP[filter.id] ?? filter.id,
    name: filter.name,
    type: filter.type,
    supportsIncludeExclude: Boolean(filter.supportsIncludeExclude),
    allowCustomValues: Boolean(filter.allowCustomValues),
    formFields: filter.formFields ?? [],
    options: normalizeOptions(filter.options ?? filter.presetOptions),
    subFilters,
  };
});

// --- Option exports ---
const industry = normalizeOptions(getFilterById("industry")?.options);
const seniority = normalizeOptions(getFilterById("seniority")?.options);
const companyType = normalizeOptions(getFilterById("company-type")?.options);
const linkedInBadge = normalizeOptions(getFilterById("linkedin-profile-badge")?.options);
const funding = normalizeOptions(getFilterById("funding")?.options);
const technology = normalizeOptions(getFilterById("technology")?.options);
const jobTitle = normalizeOptions(getFilterById("job-title")?.options);
const productsServices = normalizeOptions(getFilterById("products-services")?.options);
const socialMedia = normalizeOptions(getFilterById("social-media")?.options);
const keywordSources = normalizeOptions(
  getFilterById("keywords")?.subFilters?.find((sf) => sf.id === "keyword-sources")?.options,
);
const degree = normalizeOptions(
  getFilterById("education")?.subFilters?.find((sf) => sf.id === "degree")?.options?.map((d) =>
    typeof d === "string" ? d : d,
  ),
);
const fieldOfStudy = normalizeOptions(
  getFilterById("education")?.subFilters?.find((sf) => sf.id === "field-of-study")?.options?.map((d) =>
    typeof d === "string" ? d : d,
  ),
);
const personLanguages = normalizeOptions(
  getFilterById("spoken-languages")?.subFilters?.find((sf) => sf.id === "person-languages")?.options,
);
const companyLanguages = normalizeOptions(
  getFilterById("spoken-languages")?.subFilters?.find((sf) => sf.id === "company-languages")?.options,
);
const headcountJobFunctions = normalizeOptions(
  getFilterById("headcount-growth")?.subFilters?.find((sf) => sf.id === "job-functions")?.options,
);
const departmentJobFunctions = normalizeOptions(
  getFilterById("employees-by-department")?.subFilters?.find((sf) => sf.id === "job-functions")?.options,
);
const headcountTimeFrames = normalizeOptions(
  getFilterById("headcount-growth")?.subFilters?.find((sf) => sf.id === "time-frame")?.options,
);
const employeeSize = buildRangeMeta(getFilterById("employees")?.options);
const annualRevenue = buildRangeMeta(getFilterById("annual-revenue")?.options);
const companyPresets = normalizeOptions(getFilterById("company-name")?.presetOptions?.map((p) => ({
  label: p.label,
  value: p.label,
})));
const domainPresets = normalizeOptions(
  getFilterById("company-domain")?.subFilters?.find((sf) => sf.id === "domain-search")?.presetOptions?.map((p) => ({
    label: p.label,
    value: p.value ?? p.label,
  })),
);

const locationRegions = buildLocationRegions();

function emitTsFile(filename, body) {
  const header = `/* eslint-disable */\n/** Auto-generated from lead-search-filters.json — do not edit manually. */\n\n`;
  fs.writeFileSync(path.join(outDir, filename), header + body, "utf8");
}

fs.mkdirSync(outDir, { recursive: true });

emitTsFile(
  "filter-catalog.ts",
  `export interface CatalogSubFilter {
  id: string;
  name: string;
  formFields: string[];
  options: { label: string; value: string }[];
  fields: string[];
  maxItems: number | null;
  type: string | null;
}

export interface CatalogFilter {
  jsonId: string;
  id: string;
  name: string;
  type: string;
  supportsIncludeExclude: boolean;
  allowCustomValues: boolean;
  formFields: string[];
  options: { label: string; value: string }[];
  subFilters: CatalogSubFilter[];
}

export const FILTER_CATALOG: CatalogFilter[] = ${JSON.stringify(catalogEntries, null, 2)};

export const FILTER_ORDER: string[] = ${JSON.stringify(catalogEntries.map((f) => f.id))};
`,
);

emitTsFile(
  "filter-options-data.ts",
  `export interface FilterOption {
  label: string;
  value: string;
}

export interface RangeFilterOption extends FilterOption {
  start: number;
  end: number;
}

export const INDUSTRY_OPTIONS: FilterOption[] = ${JSON.stringify(industry, null, 2)};

export const SENIORITY_OPTIONS: FilterOption[] = ${JSON.stringify(seniority, null, 2)};

export const COMPANY_TYPE_OPTIONS: FilterOption[] = ${JSON.stringify(companyType, null, 2)};

export const LINKEDIN_BADGE_OPTIONS: FilterOption[] = ${JSON.stringify(linkedInBadge, null, 2)};

export const FUNDING_OPTIONS: FilterOption[] = ${JSON.stringify(funding, null, 2)};

export const TECHNOLOGY_OPTIONS: FilterOption[] = ${JSON.stringify(technology, null, 2)};

export const JOB_TITLE_OPTIONS: FilterOption[] = ${JSON.stringify(jobTitle, null, 2)};

export const PRODUCTS_SERVICES_OPTIONS: FilterOption[] = ${JSON.stringify(productsServices, null, 2)};

export const SOCIAL_MEDIA_OPTIONS: FilterOption[] = ${JSON.stringify(socialMedia, null, 2)};

export const KEYWORD_SOURCE_OPTIONS: FilterOption[] = ${JSON.stringify(keywordSources, null, 2)};

export const DEGREE_OPTIONS: FilterOption[] = ${JSON.stringify(degree, null, 2)};

export const FIELD_OF_STUDY_OPTIONS: FilterOption[] = ${JSON.stringify(fieldOfStudy, null, 2)};

export const PERSON_LANGUAGE_OPTIONS: FilterOption[] = ${JSON.stringify(personLanguages, null, 2)};

export const COMPANY_LANGUAGE_OPTIONS: FilterOption[] = ${JSON.stringify(companyLanguages, null, 2)};

export const HEADCOUNT_JOB_FUNCTION_OPTIONS: FilterOption[] = ${JSON.stringify(headcountJobFunctions, null, 2)};

export const DEPARTMENT_JOB_FUNCTION_OPTIONS: FilterOption[] = ${JSON.stringify(departmentJobFunctions, null, 2)};

export const HEADCOUNT_TIME_FRAME_OPTIONS: FilterOption[] = ${JSON.stringify(headcountTimeFrames, null, 2)};

export const EMPLOYEE_SIZE_OPTIONS: RangeFilterOption[] = ${JSON.stringify(employeeSize, null, 2)};

export const ANNUAL_REVENUE_OPTIONS: RangeFilterOption[] = ${JSON.stringify(annualRevenue, null, 2)};

export const COMPANY_PRESET_OPTIONS: FilterOption[] = ${JSON.stringify(companyPresets, null, 2)};

export const DOMAIN_PRESET_OPTIONS: FilterOption[] = ${JSON.stringify(domainPresets, null, 2)};
`,
);

emitTsFile(
  "location-regions-data.ts",
  `import type { LocationRegion } from "@/lib/location-regions-types";

export const GENERATED_LOCATION_REGIONS: LocationRegion[] = ${JSON.stringify(locationRegions, null, 2)};
`,
);

console.log("Generated filter data:");
console.log(`  Filters: ${catalogEntries.length}`);
console.log(`  Industries: ${industry.length}`);
console.log(`  Location countries: ${locationRegions.length}`);
console.log(`  Output: ${outDir}`);
