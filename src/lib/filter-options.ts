export interface FilterOption {
  value: string;
  label: string;
}

export const SENIORITY_OPTIONS: FilterOption[] = [
  { value: "founder", label: "Founder" },
  { value: "owner", label: "Owner" },
  { value: "partner", label: "Partner" },
  { value: "c_suite", label: "C-Suite" },
  { value: "vp", label: "VP" },
  { value: "director", label: "Director" },
  { value: "head", label: "Head" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
  { value: "mid-level", label: "Mid-level" },
  { value: "entry", label: "Entry" },
  { value: "intern", label: "Intern" },
];

export const DEPARTMENT_OPTIONS: FilterOption[] = [
  { value: "c_suite", label: "C-Suite" },
  { value: "executive", label: "Executive" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "digital_marketing", label: "Digital Marketing" },
  { value: "product_management", label: "Product Management" },
  { value: "software_development", label: "Software Development" },
  { value: "engineering_technical", label: "Engineering" },
  { value: "data_science", label: "Data Science" },
  { value: "design", label: "Design" },
  { value: "ui_ux", label: "UI / UX" },
  { value: "human_resources", label: "Human Resources" },
  { value: "recruiting_talent_acquisition", label: "Recruiting" },
  { value: "finance", label: "Finance" },
  { value: "accounting", label: "Accounting" },
  { value: "legal", label: "Legal" },
  { value: "information_technology", label: "Information Technology" },
  { value: "information_security", label: "Information Security" },
  { value: "operations", label: "Operations" },
  { value: "customer_success", label: "Customer Success" },
  { value: "business_development", label: "Business Development" },
  { value: "consulting", label: "Consulting" },
  { value: "education", label: "Education" },
  { value: "medical_health", label: "Medical / Health" },
];

export const INDUSTRY_OPTIONS: FilterOption[] = [
  { value: "software development", label: "Software Development" },
  { value: "information technology and services", label: "IT & Services" },
  { value: "financial services", label: "Financial Services" },
  { value: "marketing and advertising", label: "Marketing & Advertising" },
  { value: "hospitals and health care", label: "Healthcare" },
  { value: "retail", label: "Retail" },
  { value: "real estate", label: "Real Estate" },
  { value: "construction", label: "Construction" },
  { value: "education administration programs", label: "Education" },
  { value: "telecommunications", label: "Telecommunications" },
  { value: "insurance", label: "Insurance" },
  { value: "biotechnology research", label: "Biotechnology" },
  { value: "management consulting", label: "Management Consulting" },
  { value: "human resources services", label: "HR Services" },
  { value: "e-learning providers", label: "E-Learning" },
  { value: "logistics and supply chain", label: "Logistics & Supply Chain" },
  { value: "food and beverage services", label: "Food & Beverage" },
  { value: "entertainment providers", label: "Entertainment" },
  { value: "government administration", label: "Government" },
  { value: "non-profit organizations", label: "Non-profit" },
];

export const EMPLOYEE_SIZE_OPTIONS: FilterOption[] = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501-1000", label: "501–1,000 employees" },
  { value: "1001-5000", label: "1,001–5,000 employees" },
  { value: "5001-10000", label: "5,001–10,000 employees" },
  { value: "10001+", label: "10,001+ employees" },
];

export const LANGUAGE_OPTIONS: FilterOption[] = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "portuguese", label: "Portuguese" },
  { value: "italian", label: "Italian" },
  { value: "dutch", label: "Dutch" },
  { value: "chinese", label: "Chinese" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "hindi", label: "Hindi" },
  { value: "arabic", label: "Arabic" },
];

export const COMPANY_TYPE_OPTIONS: FilterOption[] = [
  { value: "PRIVATELY_HELD", label: "Privately Held" },
  { value: "PUBLIC_COMPANY", label: "Public Company" },
  { value: "SELF_EMPLOYED", label: "Self Employed" },
  { value: "SELF_OWNED", label: "Self Owned" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "NON_PROFIT", label: "Non-profit" },
  { value: "EDUCATIONAL", label: "Educational" },
  { value: "GOVERNMENT_AGENCY", label: "Government Agency" },
];

const EMPLOYEE_SIZE_BUCKETS = EMPLOYEE_SIZE_OPTIONS.map((option) => {
  if (option.value === "10001+") {
    return { value: option.value, start: 10001, end: Number.MAX_SAFE_INTEGER };
  }
  const [start, end] = option.value.split("-").map(Number);
  return { value: option.value, start, end };
});

export function parseEmployeeSizeRange(
  value: string,
): { start: number; end: number } | null {
  if (value === "10001+") return { start: 10001, end: 999999 };
  const match = value.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]) };
}

/** Parse integers that may include thousands separators (e.g. "1,000"). */
export function parseFlexibleInt(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!/^\d{1,7}$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNumericEmployeeRange(
  value: string,
): { start: number; end: number } | null {
  const trimmed = value.trim();
  if (trimmed === "10001+") return { start: 10001, end: 999999 };

  const match = trimmed.match(
    /^(\d{1,3}(?:,\d{3})*|\d{1,7})\s*[-–—]\s*(\d{1,3}(?:,\d{3})*|\d{1,7})$/,
  );
  if (!match) return null;

  const start = parseFlexibleInt(match[1]);
  const end = parseFlexibleInt(match[2]);
  if (start === null || end === null || end < start) {
    return null;
  }

  return { start, end };
}

export function mapNumericRangeToEmployeeBuckets(
  start: number,
  end: number,
): string[] {
  const sizes = new Set<string>();

  for (const bucket of EMPLOYEE_SIZE_BUCKETS) {
    const overlapStart = Math.max(bucket.start, start);
    const overlapEnd = Math.min(bucket.end, end);
    // Require real overlap (skip single-point boundary touches like 200 vs 51-200).
    if (overlapEnd > overlapStart) {
      sizes.add(bucket.value);
    } else if (overlapStart === overlapEnd && overlapStart === start && start === bucket.start) {
      sizes.add(bucket.value);
    }
  }

  return [...sizes];
}

export function normalizeEmployeeSizeValues(values: string[]): {
  buckets: string[];
  customRange?: { start: number; end: number };
} {
  const allowed = EMPLOYEE_SIZE_OPTIONS.map((option) => option.value);
  const allowedMap = new Map(
    allowed.map((value) => [value.toLowerCase(), value]),
  );
  const buckets = new Set<string>();
  let customRange: { start: number; end: number } | undefined;

  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const exact = allowedMap.get(trimmed.toLowerCase());
    if (exact) {
      buckets.add(exact);
      continue;
    }

    const numeric = parseNumericEmployeeRange(trimmed);
    if (!numeric) continue;

    customRange = numeric;
    for (const bucket of mapNumericRangeToEmployeeBuckets(
      numeric.start,
      numeric.end,
    )) {
      buckets.add(bucket);
    }
  }

  return {
    buckets: [...buckets],
    customRange,
  };
}
