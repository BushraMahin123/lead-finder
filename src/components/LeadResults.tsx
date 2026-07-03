"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, fetchJson } from "@/lib/fetch-json";
import type { EnrichContactResult, EnrichType, LeadPerson, SearchFilters } from "@/types/lead";

interface LeadResultsProps {
  people: LeadPerson[];
  totalEntries: number;
  loading: boolean;
  showEmptyState?: boolean;
  searchFilters?: SearchFilters | null;
  campaignId?: string | null;
  onPeopleUpdate: (people: LeadPerson[]) => void;
  enableEnrichment?: boolean;
}

function displayName(person: LeadPerson): string {
  if (person.name) return person.name;
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || "—";
}

function displayPhone(person: LeadPerson): string {
  const phones = person.phone_numbers ?? [];
  if (phones.length === 0) return "—";
  return phones
    .map((phone) => phone.sanitized_number || phone.raw_number)
    .filter(Boolean)
    .join(", ");
}

function displayLocation(person: LeadPerson): string {
  const parts = [person.city, person.state, person.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  const org = person.organization;
  if (!org) return "—";
  return [org.city, org.state, org.country].filter(Boolean).join(", ") || "—";
}

function applyEnrichment(
  people: LeadPerson[],
  results: EnrichContactResult[],
): LeadPerson[] {
  const byId = new Map(results.map((result) => [result.id, result]));

  return people.map((person) => {
    const update = byId.get(person.id);
    if (!update || update.error) return person;

    return {
      ...person,
      email: update.email ?? person.email,
      email_status: update.email_status ?? person.email_status,
      phone_numbers: update.phone_numbers ?? person.phone_numbers,
    };
  });
}

export default function LeadResults({
  people,
  totalEntries,
  loading,
  showEmptyState = false,
  searchFilters,
  campaignId,
  onPeopleUpdate,
  enableEnrichment = true,
}: LeadResultsProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrichingType, setEnrichingType] = useState<EnrichType | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichNotice, setEnrichNotice] = useState<string | null>(null);

  const peopleIds = useMemo(
    () => people.map((person) => person.id).join(","),
    [people],
  );

  useEffect(() => {
    setSelectedIds(new Set());
    setEnrichError(null);
    setEnrichNotice(null);
  }, [peopleIds]);

  const allSelected =
    people.length > 0 && people.every((person) => selectedIds.has(person.id));
  const someSelected = selectedIds.size > 0;

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(people.map((person) => person.id)));
  }

  async function handleExtract(type: EnrichType) {
    const selectedPeople = people.filter((person) => selectedIds.has(person.id));
    if (selectedPeople.length === 0) return;

    setEnrichingType(type);
    setEnrichError(null);
    setEnrichNotice(null);

    const label = type === "email" ? "email" : "phone number";
    const labelPlural = type === "email" ? "emails" : "phone numbers";

    try {
      const { response, data } = await fetchJson("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people: selectedPeople,
          filters: searchFilters ?? undefined,
          campaignId: campaignId ?? undefined,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error(String(data.error ?? "Extraction failed"));
      }

      const results = (data.results ?? []) as EnrichContactResult[];
      const fromStorage = Number(data.fromStorage ?? 0);
      const enrichedCount = results.filter((result) =>
        type === "email" ? Boolean(result.email) : Boolean(result.phone_numbers?.length),
      ).length;
      const failed = results.filter((result) => result.error);
      const freshlyExtracted = enrichedCount - fromStorage;

      onPeopleUpdate(applyEnrichment(people, results));
      setSelectedIds(new Set());

      if (enrichedCount > 0) {
        if (fromStorage > 0 && freshlyExtracted > 0) {
          setEnrichNotice(
            `Loaded ${fromStorage} saved ${labelPlural} and extracted ${freshlyExtracted} new.`,
          );
        } else if (fromStorage > 0) {
          setEnrichNotice(
            `Loaded saved ${labelPlural} for ${fromStorage} contact${fromStorage === 1 ? "" : "s"} — no credits used.`,
          );
        } else {
          setEnrichNotice(
            `Extracted ${labelPlural} for ${enrichedCount} of ${selectedPeople.length} selected contact${selectedPeople.length === 1 ? "" : "s"}.`,
          );
        }
      } else {
        setEnrichError(`No ${labelPlural} were found for the selected contacts.`);
      }

      if (failed.length > 0 && enrichedCount > 0) {
        setEnrichNotice(
          `Extracted ${labelPlural} for ${enrichedCount} of ${selectedPeople.length}. ${failed.length} could not be enriched.`,
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login?next=/results");
        setEnrichError("Your session expired. Redirecting to sign in…");
        return;
      }
      if (err instanceof ApiError && err.status === 402) {
        setEnrichError(
          "Not enough tokens for this extraction. Visit Pricing to buy more tokens.",
        );
        return;
      }
      setEnrichError(
        err instanceof Error
          ? err.message
          : `Could not extract ${label} details`,
      );
    } finally {
      setEnrichingType(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        Fetching leads…
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
        {showEmptyState
          ? "No search yet. Use the filters on the left and click Find leads."
          : "No leads matched these filters. Try broadening your criteria."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Results</h2>
            <p className="text-sm text-slate-500">
              Showing {people.length} of {totalEntries.toLocaleString()} matches
              {someSelected && (
                <span className="text-slate-700">
                  {" "}
                  · {selectedIds.size} selected
                </span>
              )}
            </p>
          </div>

          {enableEnrichment && someSelected && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExtract("email")}
                disabled={enrichingType !== null}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enrichingType === "email"
                  ? "Extracting emails…"
                  : `Extract emails (${selectedIds.size})`}
              </button>
              <button
                type="button"
                onClick={() => handleExtract("phone")}
                disabled={enrichingType !== null}
                className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enrichingType === "phone"
                  ? "Extracting phones…"
                  : `Extract phone numbers (${selectedIds.size})`}
              </button>
            </div>
          )}
        </div>

        {enrichError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {enrichError}
          </p>
        )}

        {enrichNotice && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {enrichNotice}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">
                {enableEnrichment && (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all results"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                )}
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">LinkedIn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((person) => (
              <tr
                key={person.id}
                className={
                  selectedIds.has(person.id)
                    ? "bg-indigo-50/60 hover:bg-indigo-50"
                    : "hover:bg-slate-50/80"
                }
              >
                <td className="px-4 py-3">
                  {enableEnrichment && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(person.id)}
                      onChange={() => toggleOne(person.id)}
                      aria-label={`Select ${displayName(person)}`}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {displayName(person)}
                </td>
                <td className="px-4 py-3 text-slate-700">{person.title ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">
                  <div>{person.organization?.name ?? "—"}</div>
                  {person.organization?.primary_domain && (
                    <div className="text-xs text-slate-500">
                      {person.organization.primary_domain}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {person.email ? (
                    <div>
                      <a
                        href={`mailto:${person.email}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {person.email}
                      </a>
                      {person.email_status && (
                        <div className="text-xs text-slate-500">
                          {person.email_status}
                        </div>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{displayPhone(person)}</td>
                <td className="px-4 py-3 text-slate-700">{displayLocation(person)}</td>
                <td className="px-4 py-3">
                  {person.linkedin_url ? (
                    <a
                      href={person.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Profile
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
