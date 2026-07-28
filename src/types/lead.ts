export type EnrichType = "email" | "phone";

export interface EnrichContactResult {
  id: string;
  email?: string;
  email_status?: string;
  phone_numbers?: Array<{
    raw_number?: string;
    sanitized_number?: string;
    type?: string;
  }>;
  error?: string;
  fromStorage?: boolean;
}

export interface EnrichResponse {
  results: EnrichContactResult[];
}

export interface LeadOrganization {
  name?: string;
  website_url?: string;
  primary_domain?: string;
  industry?: string;
  estimated_num_employees?: number;
  city?: string;
  state?: string;
  country?: string;
}

export interface LeadPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  email_status?: string;
  phone_numbers?: Array<{
    raw_number?: string;
    sanitized_number?: string;
    type?: string;
  }>;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  seniority?: string;
  departments?: string[];
  organization?: LeadOrganization;
  has_email?: boolean;
  has_direct_phone?: string | boolean;
  email_extraction_failed?: boolean;
  phone_extraction_failed?: boolean;
}

export type SearchMode = "people" | "linkedin";

export interface SearchFilters {
  searchMode?: SearchMode;
  linkedInUrls?: string;
  companyName?: string;
  keywords?: string;
  jobTitle?: string;
  locations?: string[];
  companyLocations?: string[];
  companyDomain?: string;
  industries?: string[];
  seniorities?: string[];
  departments?: string[];
  employeeSizes?: string[];
  employeeCountMin?: number;
  employeeCountMax?: number;
  /** Minimum total years of professional experience (AI Ark duration.total). */
  experienceYearsMin?: number;
  /** Maximum total years of professional experience. */
  experienceYearsMax?: number;
  languages?: string[];
  companyTypes?: string[];
  personName?: string;
  /** When true, `personName` removes matching people from results instead of including them. */
  personNameExclude?: boolean;
  skills?: string;
  linkedInBadge?: string;
  funding?: string;
  technology?: string;
  annualRevenue?: string;
  /** Parsed minimum annual revenue in USD (for AI Ark revenue range). */
  annualRevenueMin?: number;
  /** Parsed maximum annual revenue in USD. */
  annualRevenueMax?: number;
  productsServices?: string;
  education?: string;
  socialMedia?: string;
  certifications?: string;
  foundedYear?: string;
  headcountGrowth?: string;
  /** Company LinkedIn page URLs (one per line). */
  companyLinkedInUrls?: string;
  /** Bulk company domains (one per line). */
  companyDomainBulk?: string;
  keywordSources?: string[];
  fundingTypes?: string[];
  fundingAmountMin?: number;
  fundingAmountMax?: number;
  educationSchool?: string;
  educationDegrees?: string[];
  educationFieldsOfStudy?: string[];
  educationDateStart?: string;
  educationDateEnd?: string;
  companyLanguages?: string[];
  foundedYearStart?: string;
  foundedYearEnd?: string;
  headcountGrowthJobFunctions?: string[];
  headcountGrowthPercent?: string;
  headcountGrowthTimeFrame?: string;
  departmentEmployeeCountMin?: number;
  departmentEmployeeCountMax?: number;
  jobTitlePrimaryActiveRoleOnly?: boolean;
  annualRevenueRanges?: string[];
  page?: number;
  perPage?: number;
  enrichContacts?: boolean;
}

export interface SearchResponse {
  people: LeadPerson[];
  totalEntries: number;
  /** Raw provider page size before title/location post-filter (for pagination). */
  providerPageCount?: number;
  page: number;
  perPage: number;
  cached?: boolean;
  cachedAt?: string;
  expiresAt?: string;
}
