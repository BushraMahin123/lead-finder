"use client";

import { useEffect, useMemo, useState } from "react";
import FilterNavRow from "@/components/FilterNavRow";
import AISearchSidebar from "@/components/AISearchSidebar";
import FilterSection from "@/components/FilterSection";
import LocationFilterSection from "@/components/LocationFilterSection";
import {
  CatalogSubFilterPanel,
  mergeKeywords,
  mergeListValues,
  textInputClassName,
} from "@/components/filter-panel-utils";
import {
  FILTER_DEFINITIONS,
  getFilterCatalog,
  type FilterId,
} from "@/lib/filter-definitions";
import {
  COMPANY_LOCATION_REGIONS,
  PERSON_LOCATION_REGIONS,
} from "@/lib/location-regions";
import {
  ANNUAL_REVENUE_OPTIONS,
  COMPANY_LANGUAGE_OPTIONS,
  COMPANY_PRESET_OPTIONS,
  COMPANY_TYPE_OPTIONS,
  DEGREE_OPTIONS,
  DEPARTMENT_JOB_FUNCTION_OPTIONS,
  DOMAIN_PRESET_OPTIONS,
  EMPLOYEE_SIZE_OPTIONS,
  FIELD_OF_STUDY_OPTIONS,
  FUNDING_OPTIONS,
  HEADCOUNT_JOB_FUNCTION_OPTIONS,
  HEADCOUNT_TIME_FRAME_OPTIONS,
  INDUSTRY_OPTIONS,
  JOB_TITLE_OPTIONS,
  KEYWORD_SOURCE_OPTIONS,
  LINKEDIN_BADGE_OPTIONS,
  PERSON_LANGUAGE_OPTIONS,
  PRODUCTS_SERVICES_OPTIONS,
  SENIORITY_OPTIONS,
  SOCIAL_MEDIA_OPTIONS,
  TECHNOLOGY_OPTIONS,
  parseRevenueSizeRange,
} from "@/lib/filter-options";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import type { SearchFilters } from "@/types/lead";

interface FilterPanelProps {
  loading: boolean;
  onSearch: (filters: SearchFilters) => void;
  onBack?: () => void;
  appliedFilters?: Partial<SearchFilters> | null;
  searchedFilters?: Partial<SearchFilters> | null;
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
  companyLanguages: [] as string[],
  companyTypes: [] as string[],
  keywordSources: [] as string[],
  fundingTypes: [] as string[],
  educationDegrees: [] as string[],
  educationFieldsOfStudy: [] as string[],
  headcountGrowthJobFunctions: [] as string[],
  annualRevenueRanges: [] as string[],
  linkedInBadges: [] as string[],
  socialMediaPlatforms: [] as string[],
  jobTitlePresets: [] as string[],
  technologyPresets: [] as string[],
  productsServicesPresets: [] as string[],
};

function numberField(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "";
}

export default function FilterPanel({
  loading,
  onSearch,
  onBack,
  appliedFilters,
  searchedFilters,
  aiQuery,
  onAISearch,
  onClearFilters,
  collapsed = false,
  onToggleCollapse,
  aiAdjusting = false,
}: FilterPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterId | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [subFilterTabs, setSubFilterTabs] = useState<Partial<Record<FilterId, string>>>({});
  const [personName, setPersonName] = useState("");
  const [personNameExclude, setPersonNameExclude] = useState(false);
  const [linkedInUrls, setLinkedInUrls] = useState("");
  const [companyLinkedInUrls, setCompanyLinkedInUrls] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [companyDomainBulk, setCompanyDomainBulk] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobTitlePrimaryActiveRoleOnly, setJobTitlePrimaryActiveRoleOnly] =
    useState(false);
  const [keywords, setKeywords] = useState("");
  const [skills, setSkills] = useState("");
  const [funding, setFunding] = useState("");
  const [technology, setTechnology] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState("");
  const [productsServices, setProductsServices] = useState("");
  const [educationSchool, setEducationSchool] = useState("");
  const [education, setEducation] = useState("");
  const [educationDateStart, setEducationDateStart] = useState("");
  const [educationDateEnd, setEducationDateEnd] = useState("");
  const [certifications, setCertifications] = useState("");
  const [foundedYearStart, setFoundedYearStart] = useState("");
  const [foundedYearEnd, setFoundedYearEnd] = useState("");
  const [headcountGrowthPercent, setHeadcountGrowthPercent] = useState("");
  const [headcountGrowthTimeFrame, setHeadcountGrowthTimeFrame] = useState("");
  const [headcountGrowth, setHeadcountGrowth] = useState("");
  const [employeeCountMin, setEmployeeCountMin] = useState("");
  const [employeeCountMax, setEmployeeCountMax] = useState("");
  const [departmentEmployeeCountMin, setDepartmentEmployeeCountMin] = useState("");
  const [departmentEmployeeCountMax, setDepartmentEmployeeCountMax] = useState("");
  const [annualRevenueMin, setAnnualRevenueMin] = useState("");
  const [annualRevenueMax, setAnnualRevenueMax] = useState("");
  const [fundingAmountMin, setFundingAmountMin] = useState("");
  const [fundingAmountMax, setFundingAmountMax] = useState("");
  const [listFilters, setListFilters] = useState(EMPTY_LIST_FILTERS);

  function updateListFilter<K extends keyof typeof EMPTY_LIST_FILTERS>(
    key: K,
    values: (typeof EMPTY_LIST_FILTERS)[K],
  ) {
    setListFilters((current) => ({ ...current, [key]: values }));
  }

  function getSubFilterTab(filterId: FilterId, fallback: string) {
    return subFilterTabs[filterId] ?? fallback;
  }

  function setSubFilterTab(filterId: FilterId, tabId: string) {
    setSubFilterTabs((current) => ({ ...current, [filterId]: tabId }));
  }

  function applyExternalFilters(filters: Partial<SearchFilters>) {
    setPersonName(filters.personName ?? "");
    setPersonNameExclude(Boolean(filters.personNameExclude));
    setLinkedInUrls(filters.linkedInUrls ?? "");
    setCompanyLinkedInUrls(filters.companyLinkedInUrls ?? "");
    setCompanyName(filters.companyName ?? "");
    setCompanyDomain(filters.companyDomain ?? "");
    setCompanyDomainBulk(filters.companyDomainBulk ?? "");
    setJobTitle(filters.jobTitle ?? "");
    setJobTitlePrimaryActiveRoleOnly(Boolean(filters.jobTitlePrimaryActiveRoleOnly));
    setKeywords(filters.keywords ?? "");
    setSkills(filters.skills ?? "");
    setFunding(filters.funding ?? "");
    setTechnology(filters.technology ?? "");
    setAnnualRevenue(filters.annualRevenue ?? "");
    setAnnualRevenueMin(numberField(filters.annualRevenueMin));
    setAnnualRevenueMax(numberField(filters.annualRevenueMax));
    setProductsServices(filters.productsServices ?? "");
    setEducationSchool(filters.educationSchool ?? "");
    setEducation(filters.education ?? "");
    setEducationDateStart(filters.educationDateStart ?? "");
    setEducationDateEnd(filters.educationDateEnd ?? "");
    setCertifications(filters.certifications ?? "");
    setFoundedYearStart(filters.foundedYearStart ?? filters.foundedYear ?? "");
    setFoundedYearEnd(filters.foundedYearEnd ?? "");
    setHeadcountGrowth(filters.headcountGrowth ?? "");
    setHeadcountGrowthPercent(filters.headcountGrowthPercent ?? "");
    setHeadcountGrowthTimeFrame(filters.headcountGrowthTimeFrame ?? "");
    setEmployeeCountMin(numberField(filters.employeeCountMin));
    setEmployeeCountMax(numberField(filters.employeeCountMax));
    setDepartmentEmployeeCountMin(numberField(filters.departmentEmployeeCountMin));
    setDepartmentEmployeeCountMax(numberField(filters.departmentEmployeeCountMax));
    setFundingAmountMin(numberField(filters.fundingAmountMin));
    setFundingAmountMax(numberField(filters.fundingAmountMax));

    setListFilters({
      locations: filters.locations ?? [],
      companyLocations: filters.companyLocations ?? [],
      industries: filters.industries ?? [],
      seniorities: filters.seniorities ?? [],
      departments: filters.departments ?? [],
      employeeSizes: filters.employeeSizes ?? [],
      languages: filters.languages ?? [],
      companyLanguages: filters.companyLanguages ?? [],
      companyTypes: filters.companyTypes ?? [],
      keywordSources: filters.keywordSources ?? [],
      fundingTypes: filters.fundingTypes ?? [],
      educationDegrees: filters.educationDegrees ?? [],
      educationFieldsOfStudy: filters.educationFieldsOfStudy ?? [],
      headcountGrowthJobFunctions: filters.headcountGrowthJobFunctions ?? [],
      annualRevenueRanges: filters.annualRevenueRanges ?? [],
      linkedInBadges: filters.linkedInBadge
        ? filters.linkedInBadge.split(",").map((part) => part.trim()).filter(Boolean)
        : [],
      socialMediaPlatforms: filters.socialMedia
        ? filters.socialMedia.split(",").map((part) => part.trim()).filter(Boolean)
        : [],
      jobTitlePresets: [],
      technologyPresets: [],
      productsServicesPresets: [],
    });
  }

  useEffect(() => {
    if (!appliedFilters) return;
    applyExternalFilters(appliedFilters);
  }, [appliedFilters]);

  const filterHasValue: Record<FilterId, boolean> = {
    annualRevenue:
      listFilters.annualRevenueRanges.length > 0 ||
      Boolean(annualRevenue.trim()) ||
      annualRevenueMin.trim().length > 0 ||
      annualRevenueMax.trim().length > 0,
    certifications: Boolean(certifications.trim()),
    companyName: Boolean(companyName.trim()),
    companyType: listFilters.companyTypes.length > 0,
    domain: Boolean(companyDomain.trim() || companyDomainBulk.trim()),
    education:
      Boolean(educationSchool.trim() || education.trim()) ||
      listFilters.educationDegrees.length > 0 ||
      listFilters.educationFieldsOfStudy.length > 0 ||
      Boolean(educationDateStart.trim() || educationDateEnd.trim()),
    employees:
      listFilters.employeeSizes.length > 0 ||
      employeeCountMin.trim().length > 0 ||
      employeeCountMax.trim().length > 0,
    employeesDepartment:
      listFilters.departments.length > 0 ||
      departmentEmployeeCountMin.trim().length > 0 ||
      departmentEmployeeCountMax.trim().length > 0,
    foundedYear: Boolean(foundedYearStart.trim() || foundedYearEnd.trim()),
    funding:
      listFilters.fundingTypes.length > 0 ||
      Boolean(funding.trim()) ||
      fundingAmountMin.trim().length > 0 ||
      fundingAmountMax.trim().length > 0,
    headcountGrowth:
      listFilters.headcountGrowthJobFunctions.length > 0 ||
      Boolean(headcountGrowth.trim() || headcountGrowthPercent.trim()) ||
      Boolean(headcountGrowthTimeFrame.trim()),
    industry: listFilters.industries.length > 0,
    jobTitle:
      listFilters.jobTitlePresets.length > 0 ||
      Boolean(jobTitle.trim()) ||
      jobTitlePrimaryActiveRoleOnly,
    keywords:
      Boolean(keywords.trim()) || listFilters.keywordSources.length > 0,
    languages:
      listFilters.languages.length > 0 || listFilters.companyLanguages.length > 0,
    linkedInBadge: listFilters.linkedInBadges.length > 0,
    linkedInUrl: Boolean(linkedInUrls.trim() || companyLinkedInUrls.trim()),
    location:
      listFilters.locations.length > 0 || listFilters.companyLocations.length > 0,
    personName: Boolean(personName.trim()),
    productsServices:
      listFilters.productsServicesPresets.length > 0 ||
      Boolean(productsServices.trim()),
    seniority: listFilters.seniorities.length > 0,
    skills: Boolean(skills.trim()),
    socialMedia: listFilters.socialMediaPlatforms.length > 0,
    technology:
      listFilters.technologyPresets.length > 0 || Boolean(technology.trim()),
  };

  const activeFilterCount = Object.values(filterHasValue).filter(Boolean).length;

  const visibleFilters = useMemo(() => {
    const query = filterSearch.trim().toLowerCase();
    if (!query) return FILTER_DEFINITIONS;
    return FILTER_DEFINITIONS.filter((filter) =>
      filter.label.toLowerCase().includes(query),
    );
  }, [filterSearch]);

  const hasLinkedInMode =
    linkedInUrls.trim().length > 0 || companyLinkedInUrls.trim().length > 0;

  function parseOptionalNumber(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  function buildFilters(): SearchFilters {
    const mergedJobTitle = mergeListValues(jobTitle, listFilters.jobTitlePresets);
    const mergedTechnology = mergeListValues(
      technology,
      listFilters.technologyPresets,
    );
    const mergedProductsServices = mergeListValues(
      productsServices,
      listFilters.productsServicesPresets,
    );
    const mergedLinkedInBadge =
      listFilters.linkedInBadges.length > 0
        ? listFilters.linkedInBadges.join(", ")
        : undefined;
    const mergedSocialMedia =
      listFilters.socialMediaPlatforms.length > 0
        ? listFilters.socialMediaPlatforms.join(", ")
        : undefined;

    let revenueMin = parseOptionalNumber(annualRevenueMin);
    let revenueMax = parseOptionalNumber(annualRevenueMax);
    if (listFilters.annualRevenueRanges.length > 0) {
      const ranges = listFilters.annualRevenueRanges
        .map(parseRevenueSizeRange)
        .filter((range): range is { start: number; end: number } => Boolean(range));
      if (ranges.length > 0) {
        revenueMin = Math.min(...ranges.map((range) => range.start));
        revenueMax = Math.max(...ranges.map((range) => range.end));
      }
    }

    const mergedKeywords = mergeKeywords(
      keywords,
      personNameExclude ? undefined : personName,
      skills,
      mergedTechnology,
      mergedProductsServices,
      educationSchool,
      education,
      certifications,
      funding,
      foundedYearStart && foundedYearEnd
        ? `${foundedYearStart}-${foundedYearEnd}`
        : foundedYearStart || foundedYearEnd,
      headcountGrowth,
      headcountGrowthPercent,
      mergedLinkedInBadge,
    );

    const filters = {
      searchMode: hasLinkedInMode ? "linkedin" : "people",
      linkedInUrls,
      companyLinkedInUrls: companyLinkedInUrls || undefined,
      companyName,
      companyDomain,
      companyDomainBulk: companyDomainBulk || undefined,
      jobTitle: mergedJobTitle,
      jobTitlePrimaryActiveRoleOnly: jobTitlePrimaryActiveRoleOnly || undefined,
      keywords: mergedKeywords,
      personName: personName || undefined,
      personNameExclude:
        personNameExclude && personName.trim() ? true : undefined,
      skills: skills || undefined,
      linkedInBadge: mergedLinkedInBadge,
      funding:
        listFilters.fundingTypes.length > 0
          ? listFilters.fundingTypes.join(", ")
          : funding || undefined,
      fundingTypes:
        listFilters.fundingTypes.length > 0 ? listFilters.fundingTypes : undefined,
      fundingAmountMin: parseOptionalNumber(fundingAmountMin),
      fundingAmountMax: parseOptionalNumber(fundingAmountMax),
      technology: mergedTechnology,
      annualRevenue: annualRevenue || undefined,
      annualRevenueRanges:
        listFilters.annualRevenueRanges.length > 0
          ? listFilters.annualRevenueRanges
          : undefined,
      annualRevenueMin: revenueMin,
      annualRevenueMax: revenueMax,
      productsServices: mergedProductsServices,
      education: education || undefined,
      educationSchool: educationSchool || undefined,
      educationDegrees:
        listFilters.educationDegrees.length > 0
          ? listFilters.educationDegrees
          : undefined,
      educationFieldsOfStudy:
        listFilters.educationFieldsOfStudy.length > 0
          ? listFilters.educationFieldsOfStudy
          : undefined,
      educationDateStart: educationDateStart || undefined,
      educationDateEnd: educationDateEnd || undefined,
      socialMedia: mergedSocialMedia,
      certifications: certifications || undefined,
      foundedYear:
        foundedYearStart && foundedYearEnd
          ? `${foundedYearStart}-${foundedYearEnd}`
          : foundedYearStart || foundedYearEnd || undefined,
      foundedYearStart: foundedYearStart || undefined,
      foundedYearEnd: foundedYearEnd || undefined,
      headcountGrowth: headcountGrowth || undefined,
      headcountGrowthJobFunctions:
        listFilters.headcountGrowthJobFunctions.length > 0
          ? listFilters.headcountGrowthJobFunctions
          : undefined,
      headcountGrowthPercent: headcountGrowthPercent || undefined,
      headcountGrowthTimeFrame: headcountGrowthTimeFrame || undefined,
      employeeCountMin: parseOptionalNumber(employeeCountMin),
      employeeCountMax: parseOptionalNumber(employeeCountMax),
      departmentEmployeeCountMin: parseOptionalNumber(departmentEmployeeCountMin),
      departmentEmployeeCountMax: parseOptionalNumber(departmentEmployeeCountMax),
      keywordSources:
        listFilters.keywordSources.length > 0
          ? listFilters.keywordSources
          : undefined,
      locations: listFilters.locations,
      companyLocations: listFilters.companyLocations,
      industries: listFilters.industries,
      seniorities: listFilters.seniorities,
      departments: listFilters.departments,
      employeeSizes: listFilters.employeeSizes,
      languages: listFilters.languages,
      companyLanguages:
        listFilters.companyLanguages.length > 0
          ? listFilters.companyLanguages
          : undefined,
      companyTypes: listFilters.companyTypes,
      perPage: SEARCH_RESULTS_PER_PAGE,
      page: 1,
    };

    return filters;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const filters = buildFilters();
    onSearch(filters);
  }

  function clearAll() {
    setPersonName("");
    setPersonNameExclude(false);
    setLinkedInUrls("");
    setCompanyLinkedInUrls("");
    setCompanyName("");
    setCompanyDomain("");
    setCompanyDomainBulk("");
    setJobTitle("");
    setJobTitlePrimaryActiveRoleOnly(false);
    setKeywords("");
    setSkills("");
    setFunding("");
    setTechnology("");
    setAnnualRevenue("");
    setAnnualRevenueMin("");
    setAnnualRevenueMax("");
    setProductsServices("");
    setEducationSchool("");
    setEducation("");
    setEducationDateStart("");
    setEducationDateEnd("");
    setCertifications("");
    setFoundedYearStart("");
    setFoundedYearEnd("");
    setHeadcountGrowth("");
    setHeadcountGrowthPercent("");
    setHeadcountGrowthTimeFrame("");
    setEmployeeCountMin("");
    setEmployeeCountMax("");
    setDepartmentEmployeeCountMin("");
    setDepartmentEmployeeCountMax("");
    setFundingAmountMin("");
    setFundingAmountMax("");
    setListFilters(EMPTY_LIST_FILTERS);
    setSubFilterTabs({});
    setActiveFilter(null);
  }

  function renderFilterContent(id: FilterId) {
    const catalog = getFilterCatalog(id);

    switch (id) {
      case "personName":
        return (
          <div className="space-y-3">
            <input
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              placeholder="e.g. Jane Smith"
              className={textInputClassName()}
            />
            {personName.trim().length > 0 && (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <div>
                  <span className="text-sm font-medium text-slate-800">Exclude name</span>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Remove people matching this name from results
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={personNameExclude}
                  onClick={() => setPersonNameExclude((current) => !current)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    personNameExclude ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      personNameExclude ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
            )}
          </div>
        );
      case "linkedInUrl":
        return (
          <CatalogSubFilterPanel
            subFilters={catalog.subFilters}
            activeTab={getSubFilterTab(id, "company-linkedin-url")}
            onTabChange={(tabId) => setSubFilterTab(id, tabId)}
            renderSubFilter={(subFilter) => {
              if (subFilter.id === "company-linkedin-url") {
                return (
                  <div className="space-y-2">
                    <textarea
                      value={companyLinkedInUrls}
                      onChange={(event) => setCompanyLinkedInUrls(event.target.value)}
                      rows={4}
                      placeholder="https://www.linkedin.com/company/stripe/"
                      className={textInputClassName()}
                    />
                    <p className="text-xs text-slate-500">Up to 100 URLs, one per line.</p>
                  </div>
                );
              }
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
                  <p className="text-xs text-slate-500">Up to 100 URLs, one per line.</p>
                </div>
              );
            }}
          />
        );
      case "companyName":
        return (
          <div className="space-y-3">
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Stripe, Shopify…"
              className={textInputClassName()}
            />
            <FilterSection
              title="Popular companies"
              options={COMPANY_PRESET_OPTIONS}
              selected={companyName ? [companyName] : []}
              onChange={(values) => setCompanyName(values[values.length - 1] ?? "")}
              maxHeight="max-h-40"
              embedded
            />
          </div>
        );
      case "domain":
        return (
          <CatalogSubFilterPanel
            subFilters={catalog.subFilters}
            activeTab={getSubFilterTab(id, "domain-bulk")}
            onTabChange={(tabId) => setSubFilterTab(id, tabId)}
            renderSubFilter={(subFilter) => {
              if (subFilter.id === "domain-bulk") {
                return (
                  <div className="space-y-2">
                    <textarea
                      value={companyDomainBulk}
                      onChange={(event) => setCompanyDomainBulk(event.target.value)}
                      rows={4}
                      placeholder={"stripe.com\nshopify.com"}
                      className={textInputClassName()}
                    />
                    <p className="text-xs text-slate-500">Up to 100 domains, one per line.</p>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  <input
                    value={companyDomain}
                    onChange={(event) => setCompanyDomain(event.target.value)}
                    placeholder="stripe.com"
                    className={textInputClassName()}
                  />
                  <FilterSection
                    title="Popular domains"
                    options={DOMAIN_PRESET_OPTIONS}
                    selected={companyDomain ? [companyDomain] : []}
                    onChange={(values) =>
                      setCompanyDomain(values[values.length - 1] ?? "")
                    }
                    maxHeight="max-h-40"
                    embedded
                  />
                </div>
              );
            }}
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
          <div className="space-y-3">
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="CEO, Marketing Director…"
              className={textInputClassName()}
            />
            <FilterSection
              title="Popular titles"
              options={JOB_TITLE_OPTIONS}
              selected={listFilters.jobTitlePresets}
              onChange={(values) => updateListFilter("jobTitlePresets", values)}
              maxHeight="max-h-48"
              embedded
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={jobTitlePrimaryActiveRoleOnly}
                onChange={(event) =>
                  setJobTitlePrimaryActiveRoleOnly(event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Primary active role only
            </label>
          </div>
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
          <CatalogSubFilterPanel
            subFilters={catalog.subFilters}
            activeTab={getSubFilterTab(id, "company-hq")}
            onTabChange={(tabId) => setSubFilterTab(id, tabId)}
            renderSubFilter={(subFilter) => {
              if (subFilter.id === "company-hq") {
                return (
                  <LocationFilterSection
                    title="Company HQ"
                    description="Expand a country to pick states"
                    regions={COMPANY_LOCATION_REGIONS}
                    selected={listFilters.companyLocations}
                    onChange={(values) => updateListFilter("companyLocations", values)}
                    embedded
                  />
                );
              }
              return (
                <LocationFilterSection
                  title="Person location"
                  description="Expand a country to pick states"
                  regions={PERSON_LOCATION_REGIONS}
                  selected={listFilters.locations}
                  onChange={(values) => updateListFilter("locations", values)}
                  embedded
                />
              );
            }}
          />
        );
      case "keywords":
        return (
          <div className="space-y-3">
            <input
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="SaaS, fintech, AI…"
              className={textInputClassName()}
            />
            <FilterSection
              title="Keyword sources"
              options={KEYWORD_SOURCE_OPTIONS}
              selected={listFilters.keywordSources}
              onChange={(values) => updateListFilter("keywordSources", values)}
              maxHeight="max-h-48"
              embedded
            />
          </div>
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
          <FilterSection
            title="LinkedIn profile badge"
            options={LINKEDIN_BADGE_OPTIONS}
            selected={listFilters.linkedInBadges}
            onChange={(values) => updateListFilter("linkedInBadges", values)}
            embedded
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
          <CatalogSubFilterPanel
            subFilters={catalog.subFilters}
            activeTab={getSubFilterTab(id, "funding-amount")}
            onTabChange={(tabId) => setSubFilterTab(id, tabId)}
            renderSubFilter={(subFilter) => {
              if (subFilter.id === "funding-amount") {
                return (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Min amount</span>
                      <input
                        type="number"
                        min={0}
                        value={fundingAmountMin}
                        onChange={(event) => setFundingAmountMin(event.target.value)}
                        placeholder="e.g. 1000000"
                        className={textInputClassName()}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Max amount</span>
                      <input
                        type="number"
                        min={0}
                        value={fundingAmountMax}
                        onChange={(event) => setFundingAmountMax(event.target.value)}
                        placeholder="Optional"
                        className={textInputClassName()}
                      />
                    </label>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  <input
                    value={funding}
                    onChange={(event) => setFunding(event.target.value)}
                    placeholder="Series A, Seed, Bootstrapped"
                    className={textInputClassName()}
                  />
                  <FilterSection
                    title="Funding types"
                    options={FUNDING_OPTIONS}
                    selected={listFilters.fundingTypes}
                    onChange={(values) => updateListFilter("fundingTypes", values)}
                    maxHeight="max-h-48"
                    embedded
                  />
                </div>
              );
            }}
          />
        );
      case "technology":
        return (
          <div className="space-y-3">
            <input
              value={technology}
              onChange={(event) => setTechnology(event.target.value)}
              placeholder="AWS, HubSpot, React"
              className={textInputClassName()}
            />
            <FilterSection
              title="Popular technologies"
              options={TECHNOLOGY_OPTIONS}
              selected={listFilters.technologyPresets}
              onChange={(values) => updateListFilter("technologyPresets", values)}
              maxHeight="max-h-48"
              embedded
            />
          </div>
        );
      case "annualRevenue":
        return (
          <div className="space-y-3">
            <FilterSection
              title="Revenue ranges"
              options={ANNUAL_REVENUE_OPTIONS}
              selected={listFilters.annualRevenueRanges}
              onChange={(values) => updateListFilter("annualRevenueRanges", values)}
              maxHeight="max-h-48"
              embedded
            />
            <input
              value={annualRevenue}
              onChange={(event) => setAnnualRevenue(event.target.value)}
              placeholder="Custom range label"
              className={textInputClassName()}
            />
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
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Min employees</span>
                <input
                  type="number"
                  min={0}
                  value={employeeCountMin}
                  onChange={(event) => setEmployeeCountMin(event.target.value)}
                  placeholder="e.g. 50"
                  className={textInputClassName()}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Max employees</span>
                <input
                  type="number"
                  min={0}
                  value={employeeCountMax}
                  onChange={(event) => setEmployeeCountMax(event.target.value)}
                  placeholder="Optional"
                  className={textInputClassName()}
                />
              </label>
            </div>
          </div>
        );
      case "productsServices":
        return (
          <div className="space-y-3">
            <input
              value={productsServices}
              onChange={(event) => setProductsServices(event.target.value)}
              placeholder="CRM, payroll software"
              className={textInputClassName()}
            />
            <FilterSection
              title="Popular products & services"
              options={PRODUCTS_SERVICES_OPTIONS}
              selected={listFilters.productsServicesPresets}
              onChange={(values) => updateListFilter("productsServicesPresets", values)}
              maxHeight="max-h-48"
              embedded
            />
          </div>
        );
      case "education":
        return (
          <CatalogSubFilterPanel
            subFilters={catalog.subFilters}
            activeTab={getSubFilterTab(id, "degree")}
            onTabChange={(tabId) => setSubFilterTab(id, tabId)}
            renderSubFilter={(subFilter) => {
              if (subFilter.id === "school") {
                return (
                  <input
                    value={educationSchool}
                    onChange={(event) => setEducationSchool(event.target.value)}
                    placeholder="Harvard, Stanford…"
                    className={textInputClassName()}
                  />
                );
              }
              if (subFilter.id === "degree") {
                return (
                  <FilterSection
                    title="Degree"
                    options={DEGREE_OPTIONS}
                    selected={listFilters.educationDegrees}
                    onChange={(values) => updateListFilter("educationDegrees", values)}
                    maxHeight="max-h-48"
                    embedded
                  />
                );
              }
              if (subFilter.id === "field-of-study") {
                return (
                  <FilterSection
                    title="Field of study"
                    options={FIELD_OF_STUDY_OPTIONS}
                    selected={listFilters.educationFieldsOfStudy}
                    onChange={(values) =>
                      updateListFilter("educationFieldsOfStudy", values)
                    }
                    maxHeight="max-h-48"
                    embedded
                  />
                );
              }
              return (
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-slate-600">Start date</span>
                    <input
                      type="text"
                      value={educationDateStart}
                      onChange={(event) => setEducationDateStart(event.target.value)}
                      placeholder="YYYY or YYYY-MM"
                      className={textInputClassName()}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-slate-600">End date</span>
                    <input
                      type="text"
                      value={educationDateEnd}
                      onChange={(event) => setEducationDateEnd(event.target.value)}
                      placeholder="YYYY or YYYY-MM"
                      className={textInputClassName()}
                    />
                  </label>
                </div>
              );
            }}
          />
        );
      case "socialMedia":
        return (
          <FilterSection
            title="Social media"
            options={SOCIAL_MEDIA_OPTIONS}
            selected={listFilters.socialMediaPlatforms}
            onChange={(values) => updateListFilter("socialMediaPlatforms", values)}
            embedded
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
          <CatalogSubFilterPanel
            subFilters={catalog.subFilters}
            activeTab={getSubFilterTab(id, "company-languages")}
            onTabChange={(tabId) => setSubFilterTab(id, tabId)}
            renderSubFilter={(subFilter) => {
              if (subFilter.id === "company-languages") {
                return (
                  <FilterSection
                    title="Company languages"
                    options={COMPANY_LANGUAGE_OPTIONS}
                    selected={listFilters.companyLanguages}
                    onChange={(values) => updateListFilter("companyLanguages", values)}
                    maxHeight="max-h-48"
                    embedded
                  />
                );
              }
              return (
                <FilterSection
                  title="Person languages"
                  options={PERSON_LANGUAGE_OPTIONS}
                  selected={listFilters.languages}
                  onChange={(values) => updateListFilter("languages", values)}
                  maxHeight="max-h-48"
                  embedded
                />
              );
            }}
          />
        );
      case "foundedYear":
        return (
          <CatalogSubFilterPanel
            subFilters={catalog.subFilters}
            activeTab={getSubFilterTab(id, "end-year")}
            onTabChange={(tabId) => setSubFilterTab(id, tabId)}
            renderSubFilter={(subFilter) => {
              if (subFilter.id === "end-year") {
                return (
                  <input
                    type="number"
                    min={1800}
                    max={2100}
                    value={foundedYearEnd}
                    onChange={(event) => setFoundedYearEnd(event.target.value)}
                    placeholder="e.g. 2020"
                    className={textInputClassName()}
                  />
                );
              }
              return (
                <input
                  type="number"
                  min={1800}
                  max={2100}
                  value={foundedYearStart}
                  onChange={(event) => setFoundedYearStart(event.target.value)}
                  placeholder="e.g. 2015"
                  className={textInputClassName()}
                />
              );
            }}
          />
        );
      case "headcountGrowth":
        return (
          <CatalogSubFilterPanel
            subFilters={catalog.subFilters}
            activeTab={getSubFilterTab(id, "growth-percentage")}
            onTabChange={(tabId) => setSubFilterTab(id, tabId)}
            renderSubFilter={(subFilter) => {
              if (subFilter.id === "growth-percentage") {
                return (
                  <input
                    value={headcountGrowthPercent}
                    onChange={(event) => setHeadcountGrowthPercent(event.target.value)}
                    placeholder="e.g. 10%"
                    className={textInputClassName()}
                  />
                );
              }
              if (subFilter.id === "job-functions") {
                return (
                  <FilterSection
                    title="Job functions"
                    options={HEADCOUNT_JOB_FUNCTION_OPTIONS}
                    selected={listFilters.headcountGrowthJobFunctions}
                    onChange={(values) =>
                      updateListFilter("headcountGrowthJobFunctions", values)
                    }
                    maxHeight="max-h-48"
                    embedded
                  />
                );
              }
              return (
                <FilterSection
                  title="Time frame"
                  options={HEADCOUNT_TIME_FRAME_OPTIONS}
                  selected={
                    headcountGrowthTimeFrame ? [headcountGrowthTimeFrame] : []
                  }
                  onChange={(values) =>
                    setHeadcountGrowthTimeFrame(values[values.length - 1] ?? "")
                  }
                  embedded
                />
              );
            }}
          />
        );
      case "employeesDepartment":
        return (
          <CatalogSubFilterPanel
            subFilters={catalog.subFilters}
            activeTab={getSubFilterTab(id, "employee-count")}
            onTabChange={(tabId) => setSubFilterTab(id, tabId)}
            renderSubFilter={(subFilter) => {
              if (subFilter.id === "employee-count") {
                return (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Min employees</span>
                      <input
                        type="number"
                        min={0}
                        value={departmentEmployeeCountMin}
                        onChange={(event) =>
                          setDepartmentEmployeeCountMin(event.target.value)
                        }
                        placeholder="e.g. 10"
                        className={textInputClassName()}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Max employees</span>
                      <input
                        type="number"
                        min={0}
                        value={departmentEmployeeCountMax}
                        onChange={(event) =>
                          setDepartmentEmployeeCountMax(event.target.value)
                        }
                        placeholder="Optional"
                        className={textInputClassName()}
                      />
                    </label>
                  </div>
                );
              }
              return (
                <FilterSection
                  title="Job functions"
                  options={DEPARTMENT_JOB_FUNCTION_OPTIONS}
                  selected={listFilters.departments}
                  onChange={(values) => updateListFilter("departments", values)}
                  maxHeight="max-h-48"
                  embedded
                />
              );
            }}
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
          appliedFilters={searchedFilters ?? appliedFilters ?? null}
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
