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

export interface SearchFilters {
  keywords?: string;
  jobTitle?: string;
  location?: string;
  companyDomain?: string;
  industry?: string;
  seniority?: string;
  page?: number;
  perPage?: number;
  enrichContacts?: boolean;
}

export interface SearchResponse {
  people: LeadPerson[];
  totalEntries: number;
  page: number;
  perPage: number;
}
