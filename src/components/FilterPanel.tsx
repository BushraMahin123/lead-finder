"use client";

import { useEffect, useMemo, useState } from "react";
import FilterNavRow from "@/components/FilterNavRow";
import AISearchSidebar from "@/components/AISearchSidebar";
import FilterSection from "@/components/FilterSection";
import LocationFilterSection from "@/components/LocationFilterSection";
import {
  FILTER_DEFINITIONS,
  type FilterId,
} from "@/lib/filter-definitions";
import {
  COMPANY_LOCATION_REGIONS,
  PERSON_LOCATION_REGIONS,
} from "@/lib/location-regions";
import {
  COMPANY_TYPE_OPTIONS,
  DEPARTMENT_OPTIONS,
  EMPLOYEE_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
  LANGUAGE_OPTIONS,
  SENIORITY_OPTIONS,
} from "@/lib/filter-options";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import type { SearchFilters } from "@/types/lead";

interface FilterPanelProps {
  loading: boolean;
  onSearch: (filters: SearchFilters) => void;
  onBack?: () => void;
  appliedFilters?: Partial<SearchFilters> | null;
  aiQuery?: string | null;
  onAISearch?: (query: string) => void | Promise<void>;
  onClearFilters?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  aiAdjusting?: boolean;
}

const EMPTY_LIST_FILTERS = {
  locations: [] as string[],
  companyLocations: [] as string[],
  industries: [] as string[],
  seniorities: [] as string[],
  departments: [] as string[],
  employeeSizes: [] as string[],
  languages: [] as string[],
  companyTypes: [] as string[],
};

function textInputClassName() {
  return "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
}

function mergeKeywords(...parts: Array<string | undefined>): string | undefined {
  const merged = parts
    .flatMap((part) => (part ?? "").split(","))
    .map((part) => part.trim())
    .filter(Boolean);
  if (merged.length === 0) return undefined;
  return [...new Set(merged)].join(", ");
}

export default function FilterPanel({
  loading,
  onSearch,
  onBack,
  appliedFilters,
  aiQuery,
  onAISearch,
  onClearFilters,
  collapsed = false,
  onToggleCollapse,
  aiAdjusting = false,
}: FilterPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterId | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [personName, setPersonName] = useState("");
  const [linkedInUrls, setLinkedInUrls] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [skills, setSkills] = useState("");
  const [linkedInBadge, setLinkedInBadge] = useState("");
  const [funding, setFunding] = useState("");
  const [technology, setTechnology] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState("");
  const [productsServices, setProductsServices] = useState("");
  const [education, setEducation] = useState("");
  const [socialMedia, setSocialMedia] = useState("");
  const [certifications, setCertifications] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [headcountGrowth, setHeadcountGrowth] = useState("");
  const [experienceYearsMin, setExperienceYearsMin] = useState("");
  const [experienceYearsMax, setExperienceYearsMax] = useState("");
  const [employeeCountMin, setEmployeeCountMin] = useState("");
  const [employeeCountMax, setEmployeeCountMax] = useState("");
  const [annualRevenueMin, setAnnualRevenueMin] = useState("");
  const [annualRevenueMax, setAnnualRevenueMax] = useState("");
  const [listFilters, setListFilters] = useState(EMPTY_LIST_FILTERS);

  function updateListFilter<K extends keyof typeof EMPTY_LIST_FILTERS>(
    key: K,
    values: (typeof EMPTY_LIST_FILTERS)[K],
  ) {
    setListFilters((current) => ({ ...current, [key]: values }));
  }

  function applyExternalFilters(filters: Partial<SearchFilters>) {
    // Full replace — never merge with the previous AI/manual filter state.
    setPersonName(filters.personName ?? "");
    setLinkedInUrls(filters.linkedInUrls ?? "");
    setCompanyName(filters.companyName ?? "");
    setCompanyDomain(filters.companyDomain ?? "");
    setJobTitle(filters.jobTitle ?? "");
    setKeywords(filters.keywords ?? "");
    setSkills(filters.skills ?? "");
    setLinkedInBadge(filters.linkedInBadge ?? "");
    setFunding(filters.funding ?? "");
    setTechnology(filters.technology ?? "");
    setAnnualRevenue(filters.annualRevenue ?? "");
    setAnnualRevenueMin(
      typeof filters.annualRevenueMin === "number"
        ? String(filters.annualRevenueMin)
        : "",
    );
    setAnnualRevenueMax(
      typeof filters.annualRevenueMax === "number"
        ? String(filters.annualRevenueMax)
        : "",
    );
    setProductsServices(filters.productsServices ?? "");
    setEducation(filters.education ?? "");
    setSocialMedia(filters.socialMedia ?? "");
    setCertifications(filters.certifications ?? "");
    setFoundedYear(filters.foundedYear ?? "");
    setHeadcountGrowth(filters.headcountGrowth ?? "");
    setExperienceYearsMin(
      typeof filters.experienceYearsMin === "number"
        ? String(filters.experienceYearsMin)
        : "",
    );
    setExperienceYearsMax(
      typeof filters.experienceYearsMax === "number"
        ? String(filters.experienceYearsMax)
        : "",
    );
    setEmployeeCountMin(
      typeof filters.employeeCountMin === "number"
        ? String(filters.employeeCountMin)
        : "",
    );
    setEmployeeCountMax(
      typeof filters.employeeCountMax === "number"
        ? String(filters.employeeCountMax)
        : "",
    );

    setListFilters({
      locations: filters.locations ?? [],
      companyLocations: filters.companyLocations ?? [],
      industries: filters.industries ?? [],
      seniorities: filters.seniorities ?? [],
      departments: filters.departments ?? [],
      employeeSizes: filters.employeeSizes ?? [],
      languages: filters.languages ?? [],
      companyTypes: filters.companyTypes ?? [],
    });
  }

  useEffect(() => {
    if (!appliedFilters) return;
    applyExternalFilters(appliedFilters);
  }, [appliedFilters]);

  const visibleFilters = useMemo(() => {
    const query = filterSearch.trim().toLowerCase();
    if (!query) return FILTER_DEFINITIONS;
    return FILTER_DEFINITIONS.filter((filter) =>
      filter.label.toLowerCase().includes(query),
    );
  }, [filterSearch]);

  const hasLinkedInMode = linkedInUrls.trim().length > 0;

  const filterHasValue: Record<FilterId, boolean> = {
    personName: Boolean(personName.trim()),
    linkedInUrl: Boolean(linkedInUrls.trim()),
    companyName: Boolean(companyName.trim()),
    domain: Boolean(companyDomain.trim()),
    industry: listFilters.industries.length > 0,
    jobTitle: Boolean(jobTitle.trim()),
    seniority: listFilters.seniorities.length > 0,
    experienceYears:
      experienceYearsMin.trim().length > 0 || experienceYearsMax.trim().length > 0,
    location: listFilters.locations.length > 0,
    keywords: Boolean(keywords.trim()),
    skills: Boolean(skills.trim()),
    linkedInBadge: Boolean(linkedInBadge.trim()),
    companyType: listFilters.companyTypes.length > 0,
    funding: Boolean(funding.trim()),
    technology: Boolean(technology.trim()),
    annualRevenue:
      Boolean(annualRevenue.trim()) ||
      annualRevenueMin.trim().length > 0 ||
      annualRevenueMax.trim().length > 0,
    employees:
      listFilters.employeeSizes.length > 0 ||
      employeeCountMin.trim().length > 0 ||
      employeeCountMax.trim().length > 0,
    productsServices: Boolean(productsServices.trim()),
    education: Boolean(education.trim()),
    socialMedia: Boolean(socialMedia.trim()),
    certifications: Boolean(certifications.trim()),
    languages: listFilters.languages.length > 0,
    foundedYear: Boolean(foundedYear.trim()),
    headcountGrowth: Boolean(headcountGrowth.trim()),
    employeesDepartment: listFilters.departments.length > 0,
  };

  const activeFilterCount = Object.values(filterHasValue).filter(Boolean).length;

  function buildFilters(): SearchFilters {
    const mergedKeywords = mergeKeywords(
      keywords,
      personName,
      skills,
      technology,
      productsServices,
      education,
      socialMedia,
      certifications,
      funding,
      foundedYear,
      headcountGrowth,
      linkedInBadge,
    );

    const parsedExperienceMin = experienceYearsMin.trim()
      ? Number(experienceYearsMin)
      : undefined;
    const parsedExperienceMax = experienceYearsMax.trim()
      ? Number(experienceYearsMax)
      : undefined;
    const parsedEmployeeMin = employeeCountMin.trim()
      ? Number(employeeCountMin)
      : undefined;
    const parsedEmployeeMax = employeeCountMax.trim()
      ? Number(employeeCountMax)
      : undefined;
    const parsedRevenueMin = annualRevenueMin.trim()
      ? Number(annualRevenueMin)
      : undefined;
    const parsedRevenueMax = annualRevenueMax.trim()
      ? Number(annualRevenueMax)
      : undefined;

    return {
      searchMode: hasLinkedInMode ? "linkedin" : "people",
      linkedInUrls,
      companyName,
      companyDomain,
      jobTitle,
      keywords: mergedKeywords,
      personName: personName || undefined,
      skills: skills || undefined,
      linkedInBadge: linkedInBadge || undefined,
      funding: funding || undefined,
      technology: technology || undefined,
      annualRevenue: annualRevenue || undefined,
      productsServices: productsServices || undefined,
      education: education || undefined,
      socialMedia: socialMedia || undefined,
      certifications: certifications || undefined,
      foundedYear: foundedYear || undefined,
      headcountGrowth: headcountGrowth || undefined,
      experienceYearsMin:
        typeof parsedExperienceMin === "number" && Number.isFinite(parsedExperienceMin)
          ? parsedExperienceMin
          : undefined,
      experienceYearsMax:
        typeof parsedExperienceMax === "number" && Number.isFinite(parsedExperienceMax)
          ? parsedExperienceMax
          : undefined,
      employeeCountMin:
        typeof parsedEmployeeMin === "number" && Number.isFinite(parsedEmployeeMin)
          ? parsedEmployeeMin
          : undefined,
      employeeCountMax:
        typeof parsedEmployeeMax === "number" && Number.isFinite(parsedEmployeeMax)
          ? parsedEmployeeMax
          : undefined,
      annualRevenueMin:
        typeof parsedRevenueMin === "number" && Number.isFinite(parsedRevenueMin)
          ? parsedRevenueMin
          : undefined,
      annualRevenueMax:
        typeof parsedRevenueMax === "number" && Number.isFinite(parsedRevenueMax)
          ? parsedRevenueMax
          : undefined,
      ...listFilters,
      perPage: SEARCH_RESULTS_PER_PAGE,
      page: 1,
    };
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSearch(buildFilters());
  }

  function clearAll() {
    setPersonName("");
    setLinkedInUrls("");
    setCompanyName("");
    setCompanyDomain("");
    setJobTitle("");
    setKeywords("");
    setSkills("");
    setLinkedInBadge("");
    setFunding("");
    setTechnology("");
    setAnnualRevenue("");
    setAnnualRevenueMin("");
    setAnnualRevenueMax("");
    setProductsServices("");
    setEducation("");
    setSocialMedia("");
    setCertifications("");
    setFoundedYear("");
    setHeadcountGrowth("");
    setExperienceYearsMin("");
    setExperienceYearsMax("");
    setEmployeeCountMin("");
    setEmployeeCountMax("");
    setListFilters(EMPTY_LIST_FILTERS);
    setActiveFilter(null);
  }

  function renderFilterContent(id: FilterId) {
    switch (id) {
      case "personName":
        return (
          <input
            value={personName}
            onChange={(event) => setPersonName(event.target.value)}
            placeholder="e.g. Jane Smith"
            className={textInputClassName()}
          />
        );
      case "linkedInUrl":
        return (
          <div className="space-y-2">
            <textarea
              value={linkedInUrls}
              onChange={(event) => setLinkedInUrls(event.target.value)}
              rows={4}
              placeholder={
                "https://www.linkedin.com/in/john-doe/\nhttps://www.linkedin.com/in/jane-smith/"
              }
              className={textInputClassName()}
            />
            <p className="text-xs text-slate-500">Up to 10 URLs, one per line.</p>
          </div>
        );
      case "companyName":
        return (
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Stripe, Shopify…"
            className={textInputClassName()}
          />
        );
      case "domain":
        return (
          <input
            value={companyDomain}
            onChange={(event) => setCompanyDomain(event.target.value)}
            placeholder="stripe.com"
            className={textInputClassName()}
          />
        );
      case "industry":
        return (
          <FilterSection
            title="Industry"
            options={INDUSTRY_OPTIONS}
            selected={listFilters.industries}
            onChange={(values) => updateListFilter("industries", values)}
            maxHeight="max-h-56"
            embedded
          />
        );
      case "jobTitle":
        return (
          <input
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="CEO, Marketing Director…"
            className={textInputClassName()}
          />
        );
      case "seniority":
        return (
          <FilterSection
            title="Seniority"
            options={SENIORITY_OPTIONS}
            selected={listFilters.seniorities}
            onChange={(values) => updateListFilter("seniorities", values)}
            embedded
          />
        );
      case "experienceYears":
        return (
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Min years</span>
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYearsMin}
                onChange={(event) => setExperienceYearsMin(event.target.value)}
                placeholder="e.g. 5"
                className={textInputClassName()}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Max years</span>
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYearsMax}
                onChange={(event) => setExperienceYearsMax(event.target.value)}
                placeholder="Optional"
                className={textInputClassName()}
              />
            </label>
          </div>
        );
      case "location":
        return (
          <LocationFilterSection
            title="Person location"
            description="Select a country, then state and city"
            regions={PERSON_LOCATION_REGIONS}
            selected={listFilters.locations}
            onChange={(values) => updateListFilter("locations", values)}
            embedded
          />
        );
      case "keywords":
        return (
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="SaaS, fintech, AI…"
            className={textInputClassName()}
          />
        );
      case "skills":
        return (
          <input
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="Python, Salesforce, SEO…"
            className={textInputClassName()}
          />
        );
      case "linkedInBadge":
        return (
          <input
            value={linkedInBadge}
            onChange={(event) => setLinkedInBadge(event.target.value)}
            placeholder="Open to work, Hiring, Creator"
            className={textInputClassName()}
          />
        );
      case "companyType":
        return (
          <FilterSection
            title="Company type"
            options={COMPANY_TYPE_OPTIONS}
            selected={listFilters.companyTypes}
            onChange={(values) => updateListFilter("companyTypes", values)}
            embedded
          />
        );
      case "funding":
        return (
          <input
            value={funding}
            onChange={(event) => setFunding(event.target.value)}
            placeholder="Series A, Seed, Bootstrapped"
            className={textInputClassName()}
          />
        );
      case "technology":
        return (
          <input
            value={technology}
            onChange={(event) => setTechnology(event.target.value)}
            placeholder="AWS, HubSpot, React"
            className={textInputClassName()}
          />
        );
      case "annualRevenue":
        return (
          <div className="space-y-2">
            <input
              value={annualRevenue}
              onChange={(event) => setAnnualRevenue(event.target.value)}
              placeholder="$1M–$10M"
              className={textInputClassName()}
            />
            {(annualRevenueMin || annualRevenueMax) && (
              <p className="text-xs text-slate-500">
                Range from AI: {annualRevenueMin || "…"}–
                {annualRevenueMax || "…"} USD
              </p>
            )}
          </div>
        );
      case "employees":
        return (
          <div className="space-y-3">
            <FilterSection
              title="Employees"
              options={EMPLOYEE_SIZE_OPTIONS}
              selected={listFilters.employeeSizes}
              onChange={(values) => updateListFilter("employeeSizes", values)}
              embedded
            />
            {(employeeCountMin || employeeCountMax) && (
              <p className="text-xs text-slate-500">
                Custom range from AI: {employeeCountMin || "…"}–
                {employeeCountMax || "…"} employees
              </p>
            )}
          </div>
        );
      case "productsServices":
        return (
          <input
            value={productsServices}
            onChange={(event) => setProductsServices(event.target.value)}
            placeholder="CRM, payroll software"
            className={textInputClassName()}
          />
        );
      case "education":
        return (
          <input
            value={education}
            onChange={(event) => setEducation(event.target.value)}
            placeholder="MBA, Computer Science"
            className={textInputClassName()}
          />
        );
      case "socialMedia":
        return (
          <input
            value={socialMedia}
            onChange={(event) => setSocialMedia(event.target.value)}
            placeholder="Twitter, YouTube"
            className={textInputClassName()}
          />
        );
      case "certifications":
        return (
          <input
            value={certifications}
            onChange={(event) => setCertifications(event.target.value)}
            placeholder="PMP, AWS Certified"
            className={textInputClassName()}
          />
        );
      case "languages":
        return (
          <FilterSection
            title="Languages"
            options={LANGUAGE_OPTIONS}
            selected={listFilters.languages}
            onChange={(values) => updateListFilter("languages", values)}
            embedded
          />
        );
      case "foundedYear":
        return (
          <input
            value={foundedYear}
            onChange={(event) => setFoundedYear(event.target.value)}
            placeholder="2015–2020"
            className={textInputClassName()}
          />
        );
      case "headcountGrowth":
        return (
          <input
            value={headcountGrowth}
            onChange={(event) => setHeadcountGrowth(event.target.value)}
            placeholder="Growing, Stable"
            className={textInputClassName()}
          />
        );
      case "employeesDepartment":
        return (
          <FilterSection
            title="Employees department"
            options={DEPARTMENT_OPTIONS}
            selected={listFilters.departments}
            onChange={(values) => updateListFilter("departments", values)}
            maxHeight="max-h-56"
            embedded
          />
        );
      default:
        return null;
    }
  }

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-slate-200 bg-slate-50 py-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="btn btn-ghost rounded-lg p-2"
          aria-label="Expand filters"
          title="Expand filters"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
            <path d="M7 5l6 5-6 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {activeFilterCount > 0 && (
          <span className="mt-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            {activeFilterCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {aiQuery && onAISearch && onClearFilters && (
        <AISearchSidebar
          query={aiQuery}
          appliedFilters={appliedFilters ?? null}
          loading={loading}
          onSearch={onAISearch}
          onClear={() => {
            clearAll();
            onClearFilters();
          }}
        />
      )}

      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="btn btn-ghost rounded-lg p-1.5"
                aria-label="Collapse filters"
                title="Collapse filters"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M13 5l-6 5 6 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                ← Back
              </button>
            )}
          </div>
        </div>

        <label className="relative mt-3 block">
          <span className="sr-only">Search filter types</span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          >
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={filterSearch}
            onChange={(event) => setFilterSearch(event.target.value)}
            placeholder="Search filters…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hidden">
        {visibleFilters.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No filters match your search.</p>
        ) : (
          visibleFilters.map((filter) => (
            <FilterNavRow
              key={filter.id}
              filter={filter}
              active={activeFilter === filter.id}
              hasValue={filterHasValue[filter.id]}
              highlight={aiAdjusting}
              onToggle={() =>
                setActiveFilter((current) =>
                  current === filter.id ? null : filter.id,
                )
              }
            >
              {renderFilterContent(filter.id)}
            </FilterNavRow>
          ))
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 border-t border-slate-200 bg-white px-4 py-4"
      >
        {activeFilterCount > 0 && (
          <p className="text-xs text-slate-500">
            {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} applied
          </p>
        )}

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Reset
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || activeFilterCount === 0}
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-slate-200"
        >
          {loading ? "Searching…" : "Apply filters"}
        </button>
      </form>
    </div>
  );
}
