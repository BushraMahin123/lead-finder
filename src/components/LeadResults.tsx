"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, fetchJson } from "@/lib/fetch-json";
import type {
  CampaignColumn,
  CampaignColumnValue,
  ContactRowMeta,
} from "@/types/campaign";
import type { EnrichContactResult, EnrichType, LeadPerson, SearchFilters } from "@/types/lead";
import AiColumnErrorIndicator from "@/components/AiColumnErrorIndicator";
import TruncatedText from "@/components/TruncatedText";
import {
  ContactNotesInput,
  ContactTrackingCell,
  rowBackgroundClass,
  rowLeftBorderClass,
  stickyCellBackground,
} from "@/components/ContactRowTracking";

interface LeadResultsProps {
  people: LeadPerson[];
  totalEntries: number;
  loading: boolean;
  showEmptyState?: boolean;
  searchFilters?: SearchFilters | null;
  campaignId?: string | null;
  onPeopleUpdate: (people: LeadPerson[]) => void;
  enableEnrichment?: boolean;
  aiColumns?: CampaignColumn[];
  columnValues?: Record<string, Record<string, CampaignColumnValue>>;
  runningColumnId?: string | null;
  onAddColumn?: () => void;
  onRunColumn?: (columnId: string, personIds: string[]) => void;
  onEditColumn?: (column: CampaignColumn) => void;
  onDeleteColumn?: (columnId: string) => void;
  enableTracking?: boolean;
  contactMeta?: Record<string, ContactRowMeta>;
  onContactMetaUpdate?: (
    personId: string,
    updates: Partial<Pick<ContactRowMeta, "status" | "notes" | "rowColor" | "isDone">>,
  ) => void;
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

const STICKY_SHADOW =
  "shadow-[4px_0_8px_-4px_rgba(15,23,42,0.08)]";

const STICKY_HEADER_CLASSES = [
  "sticky left-0 z-30 w-44 min-w-44 bg-slate-50",
  `sticky left-44 z-30 w-52 min-w-52 bg-slate-50 ${STICKY_SHADOW}`,
] as const;

function stickyBodyClass(
  index: 0 | 1,
  selected: boolean,
  meta?: ContactRowMeta,
): string {
  const bg = stickyCellBackground(meta, selected);
  const bases = [
    `sticky left-0 z-10 w-44 min-w-44 ${bg}`,
    `sticky left-44 z-10 w-52 min-w-52 ${bg} ${STICKY_SHADOW}`,
  ];
  return bases[index];
}

function isInteractiveRowTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "a, button, input, select, textarea, [data-no-row-select]",
    ),
  );
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
  aiColumns = [],
  columnValues = {},
  runningColumnId = null,
  onAddColumn,
  onRunColumn,
  onEditColumn,
  onDeleteColumn,
  enableTracking = false,
  contactMeta = {},
  onContactMetaUpdate,
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

  const someSelected = selectedIds.size > 0;

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
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
              {aiColumns.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  onClick={() =>
                    onRunColumn?.(column.id, [...selectedIds])
                  }
                  disabled={enrichingType !== null || runningColumnId !== null}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {runningColumnId === column.id
                    ? `Running ${column.name}…`
                    : `Run ${column.name} (${selectedIds.size})`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleExtract("email")}
                disabled={enrichingType !== null || runningColumnId !== null}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enrichingType === "email"
                  ? "Extracting emails…"
                  : `Extract emails (${selectedIds.size})`}
              </button>
              <button
                type="button"
                onClick={() => handleExtract("phone")}
                disabled={enrichingType !== null || runningColumnId !== null}
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
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <colgroup>
            <col className="w-44" />
            <col className="w-52" />
          </colgroup>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className={`px-3 py-3 font-medium ${STICKY_HEADER_CLASSES[0]}`}>
                Name
              </th>
              <th className={`px-3 py-3 font-medium ${STICKY_HEADER_CLASSES[1]}`}>
                Title
              </th>
              {enableTracking && (
                <>
                  <th className="min-w-[14rem] border-l border-slate-200/80 bg-slate-50/90 px-3 py-3 font-medium text-slate-700">
                    Follow-up
                  </th>
                  <th className="min-w-[12rem] bg-slate-50/90 px-3 py-3 font-medium text-slate-700">
                    Notes
                  </th>
                </>
              )}
              <th className="px-3 py-3 font-medium">Company</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">Location</th>
              <th className="px-3 py-3 font-medium">LinkedIn</th>
              {aiColumns.map((column) => (
                <th
                  key={column.id}
                  className="min-w-[10rem] px-3 py-3 font-medium text-violet-800"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{column.name}</span>
                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                      AI
                    </span>
                    {onEditColumn && (
                      <button
                        type="button"
                        onClick={() => onEditColumn(column)}
                        className="ml-auto text-xs font-medium text-slate-400 hover:text-slate-600"
                        title="Edit column"
                      >
                        Edit
                      </button>
                    )}
                    {onDeleteColumn && (
                      <button
                        type="button"
                        onClick={() => onDeleteColumn(column.id)}
                        className="text-xs font-medium text-slate-400 hover:text-red-600"
                        title="Delete column"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {onAddColumn && (
                <th className="px-3 py-3 font-medium">
                  <button
                    type="button"
                    onClick={onAddColumn}
                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    + Add AI column
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((person) => {
              const selected = selectedIds.has(person.id);
              const meta = contactMeta[person.id];
              const isDone = meta?.isDone || meta?.status === "done";

              return (
              <tr
                key={person.id}
                onClick={(event) => {
                  if (!enableEnrichment || isInteractiveRowTarget(event.target)) {
                    return;
                  }
                  toggleOne(person.id);
                }}
                className={`border-l-[3px] ${rowLeftBorderClass(meta)} ${rowBackgroundClass(meta, selected)} ${
                  enableEnrichment ? "cursor-pointer" : ""
                }`}
              >
                <td
                  className={`max-w-44 px-3 py-3 font-medium ${stickyBodyClass(0, selected, meta)} ${
                    isDone ? "text-slate-400 line-through decoration-slate-300" : "text-slate-900"
                  }`}
                >
                  <TruncatedText text={displayName(person)} className="block truncate" />
                </td>
                <td
                  className={`max-w-52 px-3 py-3 ${stickyBodyClass(1, selected, meta)} ${
                    isDone ? "text-slate-400 line-through decoration-slate-300" : "text-slate-700"
                  }`}
                >
                  {person.title ? (
                    <TruncatedText text={person.title} className="block truncate" />
                  ) : (
                    "—"
                  )}
                </td>
                {enableTracking && (
                  <>
                    <td className="border-l border-slate-200/60 px-3 py-2.5">
                      <ContactTrackingCell
                        personLabel={displayName(person)}
                        meta={meta}
                        onMetaUpdate={(updates) =>
                          onContactMetaUpdate?.(person.id, updates)
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <ContactNotesInput
                        value={meta?.notes ?? ""}
                        onChange={(notes) =>
                          onContactMetaUpdate?.(person.id, { notes })
                        }
                      />
                    </td>
                  </>
                )}
                <td className={`px-3 py-3 ${isDone ? "opacity-60" : ""}`}>
                  <div>{person.organization?.name ?? "—"}</div>
                  {person.organization?.primary_domain && (
                    <div className="text-xs text-slate-500">
                      {person.organization.primary_domain}
                    </div>
                  )}
                </td>
                <td className={`px-3 py-3 ${isDone ? "opacity-60" : ""}`}>
                  {person.email ? (
                    <div>
                      <a
                        href={`mailto:${person.email}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {person.email}
                      </a>
                      {person.email_status && (
                        <div className="mt-1">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200/80">
                            {person.email_status}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className={`px-3 py-3 text-slate-700 ${isDone ? "opacity-60" : ""}`}>{displayPhone(person)}</td>
                <td className={`px-3 py-3 text-slate-700 ${isDone ? "opacity-60" : ""}`}>{displayLocation(person)}</td>
                <td className={`px-3 py-3 ${isDone ? "opacity-60" : ""}`}>
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
                {aiColumns.map((column) => {
                  const cell = columnValues[person.id]?.[column.id];
                  const isRunning =
                    cell?.status === "running" && cell.columnId === column.id;

                  return (
                    <td
                      key={column.id}
                      className="max-w-xs px-3 py-3 text-slate-700"
                    >
                      {isRunning ? (
                        <span className="inline-flex items-center gap-2 text-xs text-violet-600">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                          Running…
                        </span>
                      ) : cell?.status === "error" ? (
                        <AiColumnErrorIndicator
                          message={cell.error ?? "AI enrichment failed"}
                        />
                      ) : cell?.value ? (
                        <span className="line-clamp-3 text-sm">{cell.value}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  );
                })}
                {onAddColumn && <td className="px-3 py-3" />}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
