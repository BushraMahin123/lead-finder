export interface LocationCity {
  value: string;
  label: string;
}

export interface LocationState {
  value: string;
  label: string;
  cities?: LocationCity[];
}

export interface LocationRegion {
  value: string;
  label: string;
  states?: LocationState[];
  cities?: LocationCity[];
}

const US_STATES: LocationState[] = [
  { value: "Alabama", label: "Alabama" },
  { value: "Alaska", label: "Alaska" },
  { value: "Arizona", label: "Arizona", cities: [{ value: "Phoenix", label: "Phoenix" }] },
  { value: "Arkansas", label: "Arkansas" },
  { value: "California", label: "California", cities: [
    { value: "San Francisco", label: "San Francisco" },
    { value: "Los Angeles", label: "Los Angeles" },
    { value: "San Diego", label: "San Diego" },
    { value: "San Jose", label: "San Jose" },
    { value: "Sacramento", label: "Sacramento" },
  ]},
  { value: "Colorado", label: "Colorado", cities: [{ value: "Denver", label: "Denver" }] },
  { value: "Connecticut", label: "Connecticut" },
  { value: "Delaware", label: "Delaware" },
  { value: "Florida", label: "Florida", cities: [
    { value: "Miami", label: "Miami" },
    { value: "Orlando", label: "Orlando" },
    { value: "Tampa", label: "Tampa" },
  ]},
  { value: "Georgia", label: "Georgia", cities: [{ value: "Atlanta", label: "Atlanta" }] },
  { value: "Hawaii", label: "Hawaii" },
  { value: "Idaho", label: "Idaho" },
  { value: "Illinois", label: "Illinois", cities: [{ value: "Chicago", label: "Chicago" }] },
  { value: "Indiana", label: "Indiana" },
  { value: "Iowa", label: "Iowa" },
  { value: "Kansas", label: "Kansas" },
  { value: "Kentucky", label: "Kentucky" },
  { value: "Louisiana", label: "Louisiana" },
  { value: "Maine", label: "Maine" },
  { value: "Maryland", label: "Maryland" },
  { value: "Massachusetts", label: "Massachusetts", cities: [{ value: "Boston", label: "Boston" }] },
  { value: "Michigan", label: "Michigan", cities: [{ value: "Detroit", label: "Detroit" }] },
  { value: "Minnesota", label: "Minnesota" },
  { value: "Mississippi", label: "Mississippi" },
  { value: "Missouri", label: "Missouri" },
  { value: "Montana", label: "Montana" },
  { value: "Nebraska", label: "Nebraska" },
  { value: "Nevada", label: "Nevada", cities: [{ value: "Las Vegas", label: "Las Vegas" }] },
  { value: "New Hampshire", label: "New Hampshire" },
  { value: "New Jersey", label: "New Jersey" },
  { value: "New Mexico", label: "New Mexico" },
  { value: "New York", label: "New York", cities: [
    { value: "New York City", label: "New York City" },
    { value: "Buffalo", label: "Buffalo" },
  ]},
  { value: "North Carolina", label: "North Carolina", cities: [
    { value: "Charlotte", label: "Charlotte" },
    { value: "Raleigh", label: "Raleigh" },
  ]},
  { value: "North Dakota", label: "North Dakota" },
  { value: "Ohio", label: "Ohio" },
  { value: "Oklahoma", label: "Oklahoma" },
  { value: "Oregon", label: "Oregon", cities: [{ value: "Portland", label: "Portland" }] },
  { value: "Pennsylvania", label: "Pennsylvania", cities: [{ value: "Philadelphia", label: "Philadelphia" }] },
  { value: "Rhode Island", label: "Rhode Island" },
  { value: "South Carolina", label: "South Carolina" },
  { value: "South Dakota", label: "South Dakota" },
  { value: "Tennessee", label: "Tennessee" },
  { value: "Texas", label: "Texas", cities: [
    { value: "Austin", label: "Austin" },
    { value: "Houston", label: "Houston" },
    { value: "Dallas", label: "Dallas" },
    { value: "San Antonio", label: "San Antonio" },
  ]},
  { value: "Utah", label: "Utah" },
  { value: "Vermont", label: "Vermont" },
  { value: "Virginia", label: "Virginia" },
  { value: "Washington", label: "Washington", cities: [{ value: "Seattle", label: "Seattle" }] },
  { value: "West Virginia", label: "West Virginia" },
  { value: "Wisconsin", label: "Wisconsin" },
  { value: "Wyoming", label: "Wyoming" },
  { value: "District of Columbia", label: "District of Columbia" },
];

const CANADA_PROVINCES: LocationState[] = [
  { value: "Ontario", label: "Ontario", cities: [{ value: "Toronto", label: "Toronto" }] },
  { value: "British Columbia", label: "British Columbia", cities: [{ value: "Vancouver", label: "Vancouver" }] },
  { value: "Quebec", label: "Quebec", cities: [{ value: "Montreal", label: "Montreal" }] },
  { value: "Alberta", label: "Alberta", cities: [{ value: "Calgary", label: "Calgary" }] },
  { value: "Manitoba", label: "Manitoba" },
  { value: "Saskatchewan", label: "Saskatchewan" },
  { value: "Nova Scotia", label: "Nova Scotia" },
  { value: "New Brunswick", label: "New Brunswick" },
];

export const PERSON_LOCATION_REGIONS: LocationRegion[] = [
  { value: "United States", label: "United States", states: US_STATES },
  { value: "Canada", label: "Canada", states: CANADA_PROVINCES },
  { value: "United Kingdom", label: "United Kingdom", cities: [{ value: "London", label: "London" }] },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Australia", label: "Australia" },
  { value: "India", label: "India" },
  { value: "Singapore", label: "Singapore" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
];

export const COMPANY_LOCATION_REGIONS: LocationRegion[] = [
  { value: "United States", label: "United States", states: US_STATES },
  { value: "Canada", label: "Canada", states: CANADA_PROVINCES },
  { value: "United Kingdom", label: "United Kingdom", cities: [{ value: "London", label: "London" }] },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Australia", label: "Australia" },
  { value: "India", label: "India" },
  { value: "Singapore", label: "Singapore" },
];

export const REMOTE_LOCATION = { value: "Remote", label: "Remote" };

export function allValuesInRegion(region: LocationRegion): string[] {
  const values = [region.value];

  for (const city of region.cities ?? []) {
    values.push(city.value);
  }

  for (const state of region.states ?? []) {
    values.push(state.value);
    for (const city of state.cities ?? []) {
      values.push(city.value);
    }
  }

  return values;
}

export function findStateInRegions(
  regions: LocationRegion[],
  stateValue: string,
): { region: LocationRegion; state: LocationState } | null {
  for (const region of regions) {
    const state = region.states?.find((item) => item.value === stateValue);
    if (state) return { region, state };
  }
  return null;
}

/** Lowercase alphanumeric only — "New York" and "NewYork" both become "newyork". */
export function compactLocationKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match locations even when users omit spaces/hyphens
 * (e.g. "NewYork", "SanFrancisco", "united-states").
 */
export function locationMentionedInText(
  text: string,
  locationValue: string,
): boolean {
  const parts = locationValue.split(/[\s/-]+/).filter(Boolean);
  if (parts.length === 0) return false;

  const flexible = parts.map(escapeRegExp).join("[\\s/_-]*");
  return new RegExp(`\\b${flexible}\\b`, "i").test(text);
}

/** Map free-form location text to a canonical allowed value when possible. */
export function canonicalizeLocationValue(
  raw: string,
  allowed: string[],
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const byLower = new Map(allowed.map((value) => [value.toLowerCase(), value]));
  const exact = byLower.get(trimmed.toLowerCase());
  if (exact) return exact;

  const compact = compactLocationKey(trimmed);
  if (!compact) return null;

  for (const value of allowed) {
    if (compactLocationKey(value) === compact) return value;
  }

  return null;
}

