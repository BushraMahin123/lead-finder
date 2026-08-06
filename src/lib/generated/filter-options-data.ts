/* eslint-disable */
/** Auto-generated from lead-search-filters.json — do not edit manually. */

import optionsData from "./filter-options-data.json";

export interface FilterOption {
  label: string;
  value: string;
}

export interface RangeFilterOption extends FilterOption {
  start: number;
  end: number;
}

export const INDUSTRY_OPTIONS = optionsData.industry as FilterOption[];
export const SENIORITY_OPTIONS = optionsData.seniority as FilterOption[];
export const COMPANY_TYPE_OPTIONS = optionsData.companyType as FilterOption[];
export const LINKEDIN_BADGE_OPTIONS = optionsData.linkedInBadge as FilterOption[];
export const FUNDING_OPTIONS = optionsData.funding as FilterOption[];
export const TECHNOLOGY_OPTIONS = optionsData.technology as FilterOption[];
export const JOB_TITLE_OPTIONS = optionsData.jobTitle as FilterOption[];
export const PRODUCTS_SERVICES_OPTIONS = optionsData.productsServices as FilterOption[];
export const SOCIAL_MEDIA_OPTIONS = optionsData.socialMedia as FilterOption[];
export const KEYWORD_SOURCE_OPTIONS = optionsData.keywordSources as FilterOption[];
export const DEGREE_OPTIONS = optionsData.degree as FilterOption[];
export const FIELD_OF_STUDY_OPTIONS = optionsData.fieldOfStudy as FilterOption[];
export const PERSON_LANGUAGE_OPTIONS = optionsData.personLanguages as FilterOption[];
export const COMPANY_LANGUAGE_OPTIONS = optionsData.companyLanguages as FilterOption[];
export const HEADCOUNT_JOB_FUNCTION_OPTIONS = optionsData.headcountJobFunctions as FilterOption[];
export const DEPARTMENT_JOB_FUNCTION_OPTIONS = optionsData.departmentJobFunctions as FilterOption[];
export const HEADCOUNT_TIME_FRAME_OPTIONS = optionsData.headcountTimeFrames as FilterOption[];
export const EMPLOYEE_SIZE_OPTIONS = optionsData.employeeSize as RangeFilterOption[];
export const ANNUAL_REVENUE_OPTIONS = optionsData.annualRevenue as RangeFilterOption[];
export const COMPANY_PRESET_OPTIONS = optionsData.companyPresets as FilterOption[];
export const DOMAIN_PRESET_OPTIONS = optionsData.domainPresets as FilterOption[];
