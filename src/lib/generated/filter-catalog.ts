/* eslint-disable */
/** Auto-generated from lead-search-filters.json — do not edit manually. */

import catalogData from "./filter-catalog.json";

export interface CatalogSubFilter {
  id: string;
  name: string;
  formFields: string[];
  options: { label: string; value: string }[];
  fields: string[];
  maxItems: number | null;
  type: string | null;
}

export interface CatalogFilter {
  jsonId: string;
  id: string;
  name: string;
  type: string;
  supportsIncludeExclude: boolean;
  allowCustomValues: boolean;
  formFields: string[];
  options: { label: string; value: string }[];
  subFilters: CatalogSubFilter[];
}

export const FILTER_CATALOG = catalogData as CatalogFilter[];

export const FILTER_ORDER: string[] = FILTER_CATALOG.map((filter) => filter.id);
