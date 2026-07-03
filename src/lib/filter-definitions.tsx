import type { ReactNode } from "react";

export type FilterId =
  | "personName"
  | "linkedInUrl"
  | "companyName"
  | "domain"
  | "industry"
  | "jobTitle"
  | "seniority"
  | "location"
  | "keywords"
  | "skills"
  | "linkedInBadge"
  | "companyType"
  | "funding"
  | "technology"
  | "annualRevenue"
  | "employees"
  | "productsServices"
  | "education"
  | "socialMedia"
  | "certifications"
  | "languages"
  | "foundedYear"
  | "headcountGrowth"
  | "employeesDepartment";

export interface FilterDefinition {
  id: FilterId;
  label: string;
  icon: ReactNode;
  placeholder?: string;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
      {children}
    </span>
  );
}

export const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    id: "personName",
    label: "Person name",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <circle cx="10" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M5 16c0-2.761 2.239-5 5-5s5 2.239 5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </Icon>
    ),
    placeholder: "e.g. Jane Smith",
  },
  {
    id: "linkedInUrl",
    label: "LinkedIn URL",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M5.2 7.2h2.4v9.6H5.2V7.2zm1.2-3.6a1.4 1.4 0 110 2.8 1.4 1.4 0 010-2.8zM8.4 7.2h2.3v1.3h.03c.32-.6 1.1-1.24 2.27-1.24 2.43 0 2.88 1.6 2.88 3.68v5.83h-2.4v-5.17c0-1.23-.02-2.8-1.7-2.8-1.7 0-1.96 1.33-1.96 2.71v5.26H8.4V7.2z" />
        </svg>
      </Icon>
    ),
  },
  {
    id: "companyName",
    label: "Company name",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <rect x="4" y="3" width="12" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Icon>
    ),
    placeholder: "Stripe, Shopify…",
  },
  {
    id: "domain",
    label: "Domain",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 10h14M10 3c2 2.5 2 11.5 0 14M10 3c-2 2.5-2 11.5 0 14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Icon>
    ),
    placeholder: "stripe.com",
  },
  {
    id: "industry",
    label: "Industry",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M4 16V8l4-3 4 3v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 16V11h4v5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Icon>
    ),
  },
  {
    id: "jobTitle",
    label: "Job title",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <rect x="4" y="7" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7V5a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Icon>
    ),
    placeholder: "CEO, Marketing Director…",
  },
  {
    id: "seniority",
    label: "Seniority",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M10 3l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.2l5-.7L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </Icon>
    ),
  },
  {
    id: "location",
    label: "Location",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M10 17s5-4.5 5-9a5 5 0 10-10 0c0 4.5 5 9 5 9z" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="8" r="1.5" fill="currentColor" />
        </svg>
      </Icon>
    ),
  },
  {
    id: "keywords",
    label: "Keywords",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11.5 11.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Icon>
    ),
    placeholder: "SaaS, fintech, AI…",
  },
  {
    id: "skills",
    label: "Skills",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M6 11l2 2 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Icon>
    ),
    placeholder: "Python, Salesforce, SEO…",
  },
  {
    id: "linkedInBadge",
    label: "LinkedIn profile badge",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Icon>
    ),
    placeholder: "Open to work, Hiring, Creator",
  },
  {
    id: "companyType",
    label: "Company Type",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M4 7h12v9H4V7z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7V5h6v2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Icon>
    ),
  },
  {
    id: "funding",
    label: "Funding",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M10 3v14M6 7h8M6 13h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Icon>
    ),
    placeholder: "Series A, Seed, Bootstrapped",
  },
  {
    id: "technology",
    label: "Technology",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M7 7l-3 3 3 3M13 7l3 3-3 3M11 5l-2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Icon>
    ),
    placeholder: "AWS, HubSpot, React",
  },
  {
    id: "annualRevenue",
    label: "Annual revenue",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M4 14l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Icon>
    ),
    placeholder: "$1M–$10M",
  },
  {
    id: "employees",
    label: "Employees",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <circle cx="7" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="13" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 16c0-2.2 1.8-4 4-4M13 12c2.2 0 4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Icon>
    ),
  },
  {
    id: "productsServices",
    label: "Products & services",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M5 6h10v9H5V6z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 6V4h4v2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Icon>
    ),
    placeholder: "CRM, payroll software",
  },
  {
    id: "education",
    label: "Education",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M3 8l7-4 7 4-7 4-7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M6 10v3c0 1.1 1.8 2 4 2s4-.9 4-2v-3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Icon>
    ),
    placeholder: "MBA, Computer Science",
  },
  {
    id: "socialMedia",
    label: "Social media",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Icon>
    ),
    placeholder: "Twitter, YouTube",
  },
  {
    id: "certifications",
    label: "Certifications",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Icon>
    ),
    placeholder: "PMP, AWS Certified",
  },
  {
    id: "languages",
    label: "Languages",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M3 10h14M10 3c2 2.5 2 11.5 0 14M10 3c-2 2.5-2 11.5 0 14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Icon>
    ),
  },
  {
    id: "foundedYear",
    label: "Founded year",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <rect x="4" y="5" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 3v3M13 3v3M4 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Icon>
    ),
    placeholder: "2015–2020",
  },
  {
    id: "headcountGrowth",
    label: "Headcount growth",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M4 14l4-5 3 3 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Icon>
    ),
    placeholder: "Growing, Stable",
  },
  {
    id: "employeesDepartment",
    label: "Employees department",
    icon: (
      <Icon>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <rect x="3" y="4" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="11" y="4" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="7" y="11" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Icon>
    ),
  },
];

export const AI_FILTER_TAGS = [
  "Job title",
  "Location",
  "Industry",
  "Company size",
] as const;
