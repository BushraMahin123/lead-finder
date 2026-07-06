export const SEARCH_TEMPLATES = [
  {
    id: "saas-founders",
    label: "Find SaaS Founders",
    description: "Founders at early-stage SaaS companies in the US",
    query: "Founders at SaaS companies in the United States with 11-50 employees",
  },
  {
    id: "vp-sales-ny",
    label: "Find VP Sales in NY",
    description: "Senior sales leaders in New York metro",
    query: "VP of Sales at B2B companies in New York with 51-200 employees",
  },
  {
    id: "marketing-directors",
    label: "Marketing Directors",
    description: "Heads of marketing at mid-market tech",
    query: "Head of Marketing or Marketing Director at technology companies in the US",
  },
] as const;
