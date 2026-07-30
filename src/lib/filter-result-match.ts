import {
  PERSON_LOCATION_REGIONS,
  REMOTE_LOCATION,
  compactLocationKey,
} from "@/lib/location-regions";
import type { LeadPerson, SearchFilters } from "@/types/lead";

const TITLE_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "and",
  "or",
  "to",
  "for",
  "in",
  "at",
  "on",
  "by",
]);

const COUNTRY_ALIASES: Record<string, string[]> = {
  "united states": ["united states", "usa", "us", "u.s.", "u.s.a.", "america"],
  canada: ["canada", "ca"],
  "united kingdom": ["united kingdom", "uk", "u.k.", "britain", "england", "scotland", "wales"],
  germany: ["germany", "deutschland", "de"],
  france: ["france", "fr"],
  netherlands: ["netherlands", "holland", "nl"],
  australia: ["australia", "au"],
  india: ["india", "in"],
  singapore: ["singapore", "sg"],
  "united arab emirates": ["united arab emirates", "uae", "u.a.e."],
};

const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
  "district of columbia": "dc",
};

function splitCsv(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * A job title filter can list alternatives ("Head of Marketing or Marketing
 * Director"); any one of them is a match.
 */
export function splitJobTitleAlternatives(value?: string): string[] {
  return (value ?? "")
    .split(/\s*,\s*|\s+or\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Providers return long-form titles ("Vice President of Sales") for acronym
 * queries ("VP of Sales"), so both sides are canonicalized before comparison.
 * Seniority stays a separate token, keeping "VP of Sales" a match for
 * "Senior VP of Sales" but not for "Head of Sales".
 */
const TITLE_PHRASE_ALIASES: Array<[RegExp, string]> = [
  [/\bchief executive officer\b/g, "ceo"],
  [/\bchief financial officer\b/g, "cfo"],
  [/\bchief technology officer\b/g, "cto"],
  [/\bchief technical officer\b/g, "cto"],
  [/\bchief operating officer\b/g, "coo"],
  [/\bchief marketing officer\b/g, "cmo"],
  [/\bchief revenue officer\b/g, "cro"],
  [/\bchief information officer\b/g, "cio"],
  [/\bchief product officer\b/g, "cpo"],
  [/\bsenior vice president\b/g, "senior vp"],
  [/\bexecutive vice president\b/g, "executive vp"],
  [/\bassistant vice president\b/g, "assistant vp"],
  [/\bvice president\b/g, "vp"],
  [/\bsvp\b/g, "senior vp"],
  [/\bevp\b/g, "executive vp"],
  [/\bavp\b/g, "assistant vp"],
  [/\bhuman resources\b/g, "hr"],
];

function canonicalizeTitleText(text: string): string {
  let normalized = text.toLowerCase();
  for (const [pattern, replacement] of TITLE_PHRASE_ALIASES) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

function singularizeToken(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (
    token.endsWith("sses") ||
    token.endsWith("ches") ||
    token.endsWith("shes") ||
    token.endsWith("xes")
  ) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function normalizeTitleTokens(text: string): string[] {
  return canonicalizeTitleText(text)
    .replace(/[^a-z0-9\s&/-]/g, " ")
    .split(/[\s/-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(singularizeToken)
    .filter((token) => !TITLE_STOP_WORDS.has(token));
}

/**
 * Person title must contain every meaningful token from at least one filter title.
 * "Finance Manager" matches "Senior Finance Manager" but not "Sales Manager".
 */
export function personMatchesJobTitle(
  personTitle: string | undefined,
  filterJobTitle: string | undefined,
): boolean {
  const filterTitles = splitJobTitleAlternatives(filterJobTitle);
  if (filterTitles.length === 0) return true;
  if (!personTitle?.trim()) return false;

  const personTokens = new Set(normalizeTitleTokens(personTitle));
  if (personTokens.size === 0) return false;

  return filterTitles.some((filterTitle) => {
    const required = normalizeTitleTokens(filterTitle);
    if (required.length === 0) return true;
    return required.every((token) => personTokens.has(token));
  });
}

function buildLocationAliasMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();

  function setAliases(canonical: string, aliases: string[]) {
    const key = canonical.toLowerCase();
    const existing = map.get(key) ?? [canonical];
    map.set(key, [...new Set([...existing, ...aliases, canonical])]);
  }

  for (const [country, aliases] of Object.entries(COUNTRY_ALIASES)) {
    setAliases(country, aliases);
  }

  setAliases(REMOTE_LOCATION.value, ["remote", "work from home", "wfh"]);

  for (const region of PERSON_LOCATION_REGIONS) {
    const countryAliases = COUNTRY_ALIASES[region.value.toLowerCase()] ?? [
      region.value,
    ];
    setAliases(region.value, countryAliases);

    for (const city of region.cities ?? []) {
      setAliases(city.value, [city.value]);
    }

    for (const state of region.states ?? []) {
      const abbr = STATE_ABBREVIATIONS[state.value.toLowerCase()];
      const stateAliases = [state.value, ...(abbr ? [abbr] : [])];
      setAliases(state.value, stateAliases);

      for (const city of state.cities ?? []) {
        // City filters must stay city-specific — do not widen to the whole state.
        setAliases(city.value, [city.value]);
      }
    }
  }

  return map;
}

const LOCATION_ALIASES = buildLocationAliasMap();

function personLocationText(person: LeadPerson): string {
  return [person.city, person.state, person.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function textMatchesLocationAlias(text: string, alias: string): boolean {
  const compactText = compactLocationKey(text);
  const compactAlias = compactLocationKey(alias);
  if (!compactText || !compactAlias) return false;

  if (compactText === compactAlias || compactText.includes(compactAlias)) {
    return true;
  }

  // Short aliases (CA, NY, UK) require token boundaries to avoid false positives.
  if (compactAlias.length <= 3) {
    const tokenPattern = new RegExp(
      `(^|[^a-z0-9])${compactAlias}([^a-z0-9]|$)`,
      "i",
    );
    return tokenPattern.test(text.toLowerCase());
  }

  return false;
}

/**
 * Person city/state/country must match at least one selected location
 * (including common aliases like CA for California).
 */
export function personMatchesLocations(
  person: LeadPerson,
  filterLocations: string[] | undefined,
): boolean {
  const locations = (filterLocations ?? []).map((value) => value.trim()).filter(Boolean);
  if (locations.length === 0) return true;

  const text = personLocationText(person);
  if (!text) return false;

  return locations.some((location) => {
    const aliases =
      LOCATION_ALIASES.get(location.toLowerCase()) ?? [location];
    return aliases.some((alias) => textMatchesLocationAlias(text, alias));
  });
}

export function personMatchesExcludedName(
  person: LeadPerson,
  excludeName: string,
): boolean {
  const query = excludeName.trim().toLowerCase();
  if (!query) return false;

  const displayName = (
    person.name ??
    [person.first_name, person.last_name].filter(Boolean).join(" ")
  )
    .trim()
    .toLowerCase();
  if (!displayName) return false;

  if (displayName.includes(query)) return true;

  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => displayName.includes(token));
}

function splitNameList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function personMatchesAnyExcludedName(
  person: LeadPerson,
  excludeNames: string | undefined,
): boolean {
  const names = splitNameList(excludeNames);
  if (names.length === 0) return false;
  return names.some((name) => personMatchesExcludedName(person, name));
}

export function personMatchesSearchFilters(
  person: LeadPerson,
  filters: SearchFilters,
): boolean {
  if (!personMatchesJobTitle(person.title, filters.jobTitle)) {
    return false;
  }

  if (!personMatchesLocations(person, filters.locations)) {
    return false;
  }

  return true;
}

export function filterPeopleBySearchFilters(
  people: LeadPerson[],
  filters: SearchFilters,
): LeadPerson[] {
  const hasTitle = Boolean(filters.jobTitle?.trim());
  const hasLocation = Boolean(filters.locations?.length);
  const hasNameExclude = Boolean(
    filters.personNameExclude && filters.personName?.trim(),
  );
  if (!hasTitle && !hasLocation && !hasNameExclude) return people;

  return people.filter((person) => {
    if (hasNameExclude && personMatchesAnyExcludedName(person, filters.personName)) {
      return false;
    }

    if (!hasTitle && !hasLocation) return true;

    return personMatchesSearchFilters(person, filters);
  });
}
