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
  languages?: string[];
  companyTypes?: string[];
  personName?: string;
  skills?: string;
  linkedInBadge?: string;
  funding?: string;
  technology?: string;
  annualRevenue?: string;
  productsServices?: string;
  education?: string;
  socialMedia?: string;
  certifications?: string;
  foundedYear?: string;
  headcountGrowth?: string;
  page?: number;
  perPage?: number;
  enrichContacts?: boolean;
}

export interface SearchResponse {
  people: LeadPerson[];
  totalEntries: number;
  page: number;
  perPage: number;
  cached?: boolean;
  cachedAt?: string;
  expiresAt?: string;
}
