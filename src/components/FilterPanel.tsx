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
  const [listFilters, setListFilters] = useState(EMPTY_LIST_FILTERS);

  function updateListFilter<K extends keyof typeof EMPTY_LIST_FILTERS>(
    key: K,
    values: (typeof EMPTY_LIST_FILTERS)[K],
  ) {
    setListFilters((current) => ({ ...current, [key]: values }));
  }

  function applyExternalFilters(filters: Partial<SearchFilters>) {
    if (filters.personName) setPersonName(filters.personName);
    if (filters.linkedInUrls) setLinkedInUrls(filters.linkedInUrls);
    if (filters.companyName) setCompanyName(filters.companyName);
    if (filters.companyDomain) setCompanyDomain(filters.companyDomain);
    if (filters.jobTitle) setJobTitle(filters.jobTitle);
    if (filters.keywords) setKeywords(filters.keywords);
    if (filters.skills) setSkills(filters.skills);
    if (filters.linkedInBadge) setLinkedInBadge(filters.linkedInBadge);
    if (filters.funding) setFunding(filters.funding);
    if (filters.technology) setTechnology(filters.technology);
    if (filters.annualRevenue) setAnnualRevenue(filters.annualRevenue);
    if (filters.productsServices) setProductsServices(filters.productsServices);
    if (filters.education) setEducation(filters.education);
    if (filters.socialMedia) setSocialMedia(filters.socialMedia);
    if (filters.certifications) setCertifications(filters.certifications);
    if (filters.foundedYear) setFoundedYear(filters.foundedYear);
    if (filters.headcountGrowth) setHeadcountGrowth(filters.headcountGrowth);

    setListFilters((current) => ({
      locations: filters.locations ?? current.locations,
      companyLocations: filters.companyLocations ?? current.companyLocations,
      industries: filters.industries ?? current.industries,
      seniorities: filters.seniorities ?? current.seniorities,
      departments: filters.departments ?? current.departments,
      employeeSizes: filters.employeeSizes ?? current.employeeSizes,
      languages: filters.languages ?? current.languages,
      companyTypes: filters.companyTypes ?? current.companyTypes,
    }));
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
    location: listFilters.locations.length > 0,
    keywords: Boolean(keywords.trim()),
    skills: Boolean(skills.trim()),
    linkedInBadge: Boolean(linkedInBadge.trim()),
    companyType: listFilters.companyTypes.length > 0,
    funding: Boolean(funding.trim()),
    technology: Boolean(technology.trim()),
    annualRevenue: Boolean(annualRevenue.trim()),
    employees: listFilters.employeeSizes.length > 0,
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
      annualRevenue,
      foundedYear,
      headcountGrowth,
      linkedInBadge,
    );

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
    setProductsServices("");
    setEducation("");
    setSocialMedia("");
    setCertifications("");
    setFoundedYear("");
    setHeadcountGrowth("");
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
          <input
            value={annualRevenue}
            onChange={(event) => setAnnualRevenue(event.target.value)}
            placeholder="$1M–$10M"
            className={textInputClassName()}
          />
        );
      case "employees":
        return (
          <FilterSection
            title="Employees"
            options={EMPLOYEE_SIZE_OPTIONS}
            selected={listFilters.employeeSizes}
            onChange={(values) => updateListFilter("employeeSizes", values)}
            embedded
          />
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

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-white">
      {aiQuery && onAISearch && onClearFilters && (
        <AISearchSidebar
          query={aiQuery}
          appliedFilters={appliedFilters ?? null}
          loading={loading}
          onSearch={onAISearch}
          onClear={onClearFilters}
        />
      )}

      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
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

      <div className="space-y-3 border-t border-slate-200 bg-white px-4 py-4">
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
      </div>
    </form>
  );
}
