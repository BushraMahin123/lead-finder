"use client";

import { useState } from "react";
import {
  REMOTE_LOCATION,
  allValuesInRegion,
  findStateInRegions,
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

function StateBlock({
  state,
  selected,
  onToggleCity,
  onRemove,
}: {
  state: LocationState;
  selected: string[];
  onToggleCity: (value: string) => void;
  onRemove: () => void;
}) {
  const hasCities = Boolean(state.cities?.length);
  const selectedCities =
    state.cities?.filter((city) => selected.includes(city.value)) ?? [];

  return (
    <div className="rounded-md border border-indigo-200 bg-white p-2 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
            ✓
          </span>
          <span className="text-sm font-semibold text-slate-900">{state.label}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-slate-500 hover:text-red-600"
        >
          Remove
        </button>
      </div>

      {hasCities ? (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 pl-1">
          <p className="text-xs text-slate-500">
            Cities
            {selectedCities.length > 0 && (
              <span className="text-indigo-600"> · {selectedCities.length} selected</span>
            )}
          </p>
          {state.cities!.map((city) => (
            <label
              key={city.value}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(city.value)}
                onChange={() => onToggleCity(city.value)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-slate-700">{city.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 pl-7 text-xs text-slate-500">Entire state selected</p>
      )}
    </div>
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
  const [statePicker, setStatePicker] = useState<Record<string, string>>({});

  function toggleValue(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  }

  function toggleCountry(region: LocationRegion) {
    if (selected.includes(region.value)) {
      const toRemove = new Set(allValuesInRegion(region));
      onChange(selected.filter((item) => !toRemove.has(item)));
      return;
    }
    onChange([...selected, region.value]);
  }

  function addState(region: LocationRegion, stateValue: string) {
    if (!stateValue || selected.includes(stateValue)) return;
    onChange([...selected, stateValue]);
    setStatePicker((current) => ({ ...current, [region.value]: "" }));
  }

  function removeState(stateValue: string) {
    const match = findStateInRegions(regions, stateValue);
    const cityValues = match?.state.cities?.map((city) => city.value) ?? [];
    const toRemove = new Set([stateValue, ...cityValues]);
    onChange(selected.filter((item) => !toRemove.has(item)));
  }

  const content = (
    <div className="space-y-3">
      {regions.map((region) => {
        const countryActive = selected.includes(region.value);
        const hasStates = Boolean(region.states?.length);
        const hasDirectCities = Boolean(region.cities?.length);
        const selectedStates =
          region.states?.filter((state) => selected.includes(state.value)) ?? [];

        return (
          <div
            key={region.value}
            className={`rounded-lg border p-2 ${
              countryActive
                ? "border-indigo-200 bg-indigo-50/30"
                : "border-slate-100 bg-white"
            }`}
          >
            <label className="flex cursor-pointer items-start gap-2 px-1 py-1 text-sm">
              <input
                type="checkbox"
                checked={countryActive}
                onChange={() => toggleCountry(region)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
              />
              <span className="font-medium text-slate-800">{region.label}</span>
              {countryActive && selectedStates.length > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {selectedStates.length} state{selectedStates.length === 1 ? "" : "s"}
                </span>
              )}
            </label>

            {countryActive && hasStates && (
              <div className="mt-2 space-y-2 border-l-2 border-indigo-200 pl-4">
                <label className="grid gap-1 text-xs text-slate-600">
                  <span>Add a state or province</span>
                  <select
                    value={statePicker[region.value] ?? ""}
                    onChange={(event) =>
                      addState(region, event.target.value)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
                  >
                    <option value="">Choose from list…</option>
                    {region.states!.map((state) => (
                      <option
                        key={state.value}
                        value={state.value}
                        disabled={selected.includes(state.value)}
                      >
                        {state.label}
                        {selected.includes(state.value) ? " — added" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedStates.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No state selected yet — use the dropdown above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedStates.map((state) => (
                      <StateBlock
                        key={state.value}
                        state={state}
                        selected={selected}
                        onToggleCity={toggleValue}
                        onRemove={() => removeState(state.value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {countryActive && !hasStates && hasDirectCities && (
              <div className="mt-2 space-y-1 border-l-2 border-indigo-200 pl-4">
                <p className="text-xs text-slate-500">Cities</p>
                {region.cities!.map((city) => (
                  <label
                    key={city.value}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(city.value)}
                      onChange={() => toggleValue(city.value)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-slate-700">{city.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-white">
        <input
          type="checkbox"
          checked={selected.includes(REMOTE_LOCATION.value)}
          onChange={() => toggleValue(REMOTE_LOCATION.value)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
        />
        <span className="text-slate-700">{REMOTE_LOCATION.label}</span>
      </label>

      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
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
        {content}
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

      {open && <div className="mt-2">{content}</div>}
    </section>
  );
}
