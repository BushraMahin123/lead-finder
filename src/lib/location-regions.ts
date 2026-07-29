import type {
  LocationCity,
  LocationRegion,
  LocationState,
} from "@/lib/location-regions-types";
import { GENERATED_LOCATION_REGIONS } from "@/lib/generated/location-regions-data";
import { withPakistanCities } from "@/lib/pakistan-location-cities";

export type { LocationCity, LocationRegion, LocationState };

const LOCATION_REGIONS: LocationRegion[] = withPakistanCities(
  GENERATED_LOCATION_REGIONS,
);

export const PERSON_LOCATION_REGIONS: LocationRegion[] = LOCATION_REGIONS;

export const COMPANY_LOCATION_REGIONS: LocationRegion[] = LOCATION_REGIONS;

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
  // Commas split too, so "Punjab, Pakistan" matches "punjab pakistan".
  const parts = locationValue.split(/[\s/,-]+/).filter(Boolean);
  if (parts.length === 0) return false;

  const flexible = parts.map(escapeRegExp).join("[\\s/_,-]*");
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
