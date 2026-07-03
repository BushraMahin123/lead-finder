import type { SearchFilters } from "@/types/lead";

const TAG_RULES: Array<{ label: string; isActive: (filters: Partial<SearchFilters>) => boolean }> = [
  { label: "Job title", isActive: (f) => Boolean(f.jobTitle?.trim()) },
  { label: "Location", isActive: (f) => Boolean(f.locations?.length || f.companyLocations?.length) },
  { label: "Industry", isActive: (f) => Boolean(f.industries?.length) },
  { label: "Company size", isActive: (f) => Boolean(f.employeeSizes?.length) },
  { label: "Company name", isActive: (f) => Boolean(f.companyName?.trim()) },
  { label: "Seniority", isActive: (f) => Boolean(f.seniorities?.length) },
  { label: "Keywords", isActive: (f) => Boolean(f.keywords?.trim()) },
  { label: "Skills", isActive: (f) => Boolean(f.skills?.trim()) },
];

export function getAppliedFilterTags(filters: Partial<SearchFilters> | null | undefined) {
  if (!filters) return [];

  return TAG_RULES.map((rule) => ({
    label: rule.label,
    active: rule.isActive(filters),
  })).filter((tag) => tag.active);
}

export function getPrimaryFilterTags(filters: Partial<SearchFilters> | null | undefined) {
  const primary = ["Job title", "Location", "Industry", "Company size"];
  const active = new Set(getAppliedFilterTags(filters).map((tag) => tag.label));

  return primary.map((label) => ({
    label,
    active: active.has(label),
  }));
}
