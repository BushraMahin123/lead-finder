export const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501-1000", label: "501–1,000 employees" },
  { value: "1000+", label: "1,000+ employees" },
] as const;

export const INDUSTRY_OPTIONS = [
  { value: "software", label: "Software & SaaS" },
  { value: "agency", label: "Agency / Consulting" },
  { value: "financial", label: "Financial services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail & eCommerce" },
  { value: "real-estate", label: "Real estate" },
  { value: "education", label: "Education" },
  { value: "recruiting", label: "Recruiting & staffing" },
  { value: "other", label: "Other" },
] as const;

export const USE_CASE_OPTIONS = [
  { value: "outbound-sales", label: "Outbound sales" },
  { value: "recruiting", label: "Recruiting" },
  { value: "market-research", label: "Market research" },
  { value: "agency-clients", label: "Agency / client work" },
  { value: "partnerships", label: "Partnerships & BD" },
  { value: "other", label: "Other" },
] as const;

export type CompanySize = (typeof COMPANY_SIZE_OPTIONS)[number]["value"];
export type Industry = (typeof INDUSTRY_OPTIONS)[number]["value"];
export type UseCase = (typeof USE_CASE_OPTIONS)[number]["value"];
