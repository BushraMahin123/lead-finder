"use client";

import { useMemo, useState } from "react";
import {
  FilterSearchInput,
  matchesFilterSearch,
} from "@/components/filter-panel-utils";
import {
  REMOTE_LOCATION,
  allValuesInRegion,
  type LocationRegion,
  type LocationState,
} from "@/lib/location-regions";

interface LocationFilterSectionProps {
  title: string;
  description?: string;
  regions: LocationRegion[];
  selected: string[];
  onChange: (values: string[]) => void;
  defaultOpen?: boolean;
  embedded?: boolean;
}

function regionMatchesSearch(region: LocationRegion, query: string): boolean {
  if (matchesFilterSearch(region.label, query)) return true;

  return (
    region.states?.some(
      (state) =>
        matchesFilterSearch(state.label, query) ||
        state.cities?.some((city) => matchesFilterSearch(city.label, query)),
    ) ?? false
  );
}

function stateMatchesSearch(state: LocationState, query: string): boolean {
  if (matchesFilterSearch(state.label, query)) return true;
  return (
    state.cities?.some((city) => matchesFilterSearch(city.label, query)) ?? false
  );
}

function allStateValues(region: LocationRegion): string[] {
  return (region.states ?? []).map((state) => state.value);
}

function allCityValues(state: LocationState): string[] {
  return (state.cities ?? []).map((city) => city.value);
}

function regionHasChildren(region: LocationRegion): boolean {
  return Boolean(region.states?.length || region.cities?.length);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      <path
        d="M7 5l6 5-6 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LocationFilterSection({
  title,
  description,
  regions,
  selected,
  onChange,
  defaultOpen = true,
  embedded = false,
}: LocationFilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedStates, setExpandedStates] = useState<Set<string>>(
    () => new Set(),
  );

  function toggleValue(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  }

  /**
   * Only the narrowest picked level is kept: a country makes its states/cities
   * redundant, and a state makes its cities redundant. Keeping both would widen
   * the search, since the API treats every value as an OR.
   */
  function selectOnly(value: string, redundant: string[]) {
    const toRemove = new Set(redundant);
    onChange([...selected.filter((item) => !toRemove.has(item)), value]);
  }

  function toggleCountry(region: LocationRegion) {
    if (selected.includes(region.value)) {
      onChange(selected.filter((item) => item !== region.value));
      return;
    }

    selectOnly(region.value, allValuesInRegion(region));
  }

  function toggleState(region: LocationRegion, state: LocationState) {
    if (selected.includes(state.value)) {
      onChange(selected.filter((item) => item !== state.value));
      return;
    }

    selectOnly(state.value, [region.value, ...allCityValues(state)]);
  }

  function toggleCity(
    region: LocationRegion,
    state: LocationState,
    cityValue: string,
  ) {
    if (selected.includes(cityValue)) {
      onChange(selected.filter((item) => item !== cityValue));
      return;
    }

    selectOnly(cityValue, [region.value, state.value]);
  }

  function toggleExpandedCountry(countryValue: string) {
    setExpandedCountries((current) => {
      const next = new Set(current);
      if (next.has(countryValue)) next.delete(countryValue);
      else next.add(countryValue);
      return next;
    });
  }

  function toggleExpandedState(stateValue: string) {
    setExpandedStates((current) => {
      const next = new Set(current);
      if (next.has(stateValue)) next.delete(stateValue);
      else next.add(stateValue);
      return next;
    });
  }

  const visibleRegions = useMemo(() => {
    const query = searchQuery.trim();
    const selectedSet = new Set(selected);

    function regionIsSelected(region: LocationRegion): boolean {
      return (
        selectedSet.has(region.value) ||
        allValuesInRegion(region).some((value) => selectedSet.has(value))
      );
    }

    const base = !query
      ? [...regions]
      : regions.filter(
          (region) =>
            regionIsSelected(region) || regionMatchesSearch(region, query),
        );

    if (selectedSet.size === 0) return base;

    return base.sort((a, b) => {
      const aSelected = regionIsSelected(a) ? 0 : 1;
      const bSelected = regionIsSelected(b) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [regions, searchQuery, selected]);


  const content = (
    <div className="space-y-1">
      {visibleRegions.length === 0 ? (
        <p className="py-2 text-sm text-slate-500">No locations match your search.</p>
      ) : (
        visibleRegions.map((region) => {
          const hasStates = Boolean(region.states?.length);
          const hasDirectCities = Boolean(region.cities?.length);
          const hasChildren = regionHasChildren(region);
          const countrySelected = selected.includes(region.value);
          const stateValues = allStateValues(region);
          const selectedStateCount = stateValues.filter((value) =>
            selected.includes(value),
          ).length;
          const selectedChildCount = allValuesInRegion(region).filter(
            (value) => value !== region.value && selected.includes(value),
          ).length;
          const countryIndeterminate =
            !countrySelected && selectedChildCount > 0;
          const countryChecked = countrySelected;
          const isExpanded = expandedCountries.has(region.value);

          const visibleStates = (() => {
            const states = [...(region.states ?? [])];
            if (selected.length === 0) return states;
            return states.sort((a, b) => {
              const aOn =
                selected.includes(a.value) ||
                allCityValues(a).some((value) => selected.includes(value))
                  ? 0
                  : 1;
              const bOn =
                selected.includes(b.value) ||
                allCityValues(b).some((value) => selected.includes(value))
                  ? 0
                  : 1;
              return aOn - bOn;
            });
          })();

          const visibleDirectCities = (() => {
            const cities = [...(region.cities ?? [])];
            if (selected.length === 0) return cities;
            return cities.sort((a, b) => {
              const aOn = selected.includes(a.value) ? 0 : 1;
              const bOn = selected.includes(b.value) ? 0 : 1;
              return aOn - bOn;
            });
          })();

          return (
            <div key={region.value} className="rounded-lg">
              <div className="flex items-center gap-1 rounded-md px-1 py-1 hover:bg-slate-50">
                {(hasStates || hasDirectCities) && (
                  <button
                    type="button"
                    onClick={() => toggleExpandedCountry(region.value)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-slate-100"
                    aria-label={isExpanded ? `Collapse ${region.label}` : `Expand ${region.label}`}
                  >
                    <Chevron open={isExpanded} />
                  </button>
                )}
                {!(hasStates || hasDirectCities) && <span className="w-6 shrink-0" />}
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={countryChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = countryIndeterminate;
                    }}
                    onChange={() => toggleCountry(region)}
                    onClick={(event) => event.stopPropagation()}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (hasStates || hasDirectCities) {
                        toggleExpandedCountry(region.value);
                      }
                    }}
                    className={`min-w-0 flex-1 text-left font-medium text-slate-800 ${
                      hasStates || hasDirectCities ? "hover:text-indigo-700" : ""
                    }`}
                  >
                    {region.label}
                  </button>
                  {selectedStateCount > 0 && !countrySelected && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      {selectedStateCount}
                    </span>
                  )}
                </label>
              </div>

              {isExpanded && hasStates && (
                <div className="ml-3 space-y-0.5 border-l border-slate-200 pl-2">
                  {visibleStates.map((state) => {
                    const hasCities = Boolean(state.cities?.length);
                    const stateSelected = selected.includes(state.value);
                    const cityValues = allCityValues(state);
                    const selectedCityCount = cityValues.filter((value) =>
                      selected.includes(value),
                    ).length;
                    const stateIndeterminate =
                      !stateSelected && selectedCityCount > 0;
                    const stateChecked = stateSelected;
                    const stateExpanded =
                      expandedStates.has(state.value) || stateIndeterminate;

                    const visibleCities = (() => {
                      const cities = [...(state.cities ?? [])];
                      if (selected.length === 0) return cities;
                      return cities.sort((a, b) => {
                        const aOn = selected.includes(a.value) ? 0 : 1;
                        const bOn = selected.includes(b.value) ? 0 : 1;
                        return aOn - bOn;
                      });
                    })();

                    return (
                      <div key={state.value}>
                        <div className="flex items-center gap-1 rounded-md px-1 py-1 hover:bg-slate-50">
                          {hasCities ? (
                            <button
                              type="button"
                              onClick={() => toggleExpandedState(state.value)}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-slate-100"
                              aria-label={
                                stateExpanded
                                  ? `Collapse ${state.label}`
                                  : `Expand ${state.label}`
                              }
                            >
                              <Chevron open={stateExpanded} />
                            </button>
                          ) : (
                            <span className="w-6 shrink-0" />
                          )}
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={stateChecked}
                              ref={(el) => {
                                if (el) el.indeterminate = stateIndeterminate;
                              }}
                              onChange={() => toggleState(region, state)}
                              className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
                            />
                            {hasCities ? (
                              <button
                                type="button"
                                onClick={() => toggleExpandedState(state.value)}
                                className="min-w-0 flex-1 text-left text-slate-700 hover:text-indigo-700"
                              >
                                {state.label}
                              </button>
                            ) : (
                              <span className="text-slate-700">{state.label}</span>
                            )}
                            {selectedCityCount > 0 && !stateSelected && (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                                {selectedCityCount}
                              </span>
                            )}
                          </label>
                        </div>

                        {stateExpanded && hasCities && (
                          <div className="ml-3 space-y-0.5 border-l border-slate-200 pl-2">
                            {visibleCities.map((city) => {
                              const cityChecked = selected.includes(city.value);

                              return (
                                <label
                                  key={city.value}
                                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50"
                                >
                                  <span className="w-6 shrink-0" />
                                  <input
                                    type="checkbox"
                                    checked={cityChecked}
                                    onChange={() =>
                                      toggleCity(region, state, city.value)
                                    }
                                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
                                  />
                                  <span className="text-slate-700">{city.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isExpanded && !hasStates && hasDirectCities && (
                <div className="ml-3 space-y-0.5 border-l border-slate-200 pl-2">
                  {visibleDirectCities.map((city) => {
                    const cityChecked = selected.includes(city.value);
                    return (
                      <label
                        key={city.value}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50"
                      >
                        <span className="w-6 shrink-0" />
                        <input
                          type="checkbox"
                          checked={cityChecked}
                          onChange={() => toggleValue(city.value)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
                        />
                        <span className="text-slate-700">{city.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {(!searchQuery.trim() ||
        matchesFilterSearch(REMOTE_LOCATION.label, searchQuery)) && (
        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
          <span className="w-6 shrink-0" />
          <input
            type="checkbox"
            checked={selected.includes(REMOTE_LOCATION.value)}
            onChange={() => toggleValue(REMOTE_LOCATION.value)}
            className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
          />
          <span className="text-slate-700">{REMOTE_LOCATION.label}</span>
        </label>
      )}

      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="px-1 pt-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          Clear locations ({selected.length})
        </button>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-2">
        {description && <p className="text-xs text-slate-500">{description}</p>}
        <FilterSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search locations…"
        />
        <div className="max-h-72 overflow-y-auto pr-1 scrollbar-hidden">{content}</div>
      </div>
    );
  }

  return (
    <section className="border-b border-slate-100 py-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
        <span className="text-xs text-slate-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <FilterSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search locations…"
          />
          <div className="max-h-72 overflow-y-auto pr-1 scrollbar-hidden">{content}</div>
        </div>
      )}
    </section>
  );
}
