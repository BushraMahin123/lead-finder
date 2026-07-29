"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AddAiColumnModal from "@/components/AddAiColumnModal";
import { AISearchIconBadge } from "@/components/AISearchIcon";
import ExportContactsButton from "@/components/ExportContactsButton";
import LeadResults from "@/components/LeadResults";
import { ApiError, fetchJson } from "@/lib/fetch-json";
import { notifyBillingBalanceRefresh } from "@/hooks/useBillingBalance";
import { SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import type {
  CampaignColumn,
  CampaignColumnValue,
  CampaignWithContacts,
  ContactRowMeta,
} from "@/types/campaign";
import type { LeadPerson } from "@/types/lead";

export default function CampaignContacts() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [campaign, setCampaign] = useState<CampaignWithContacts | null>(null);
  const [allPeople, setAllPeople] = useState<LeadPerson[]>([]);
  const [aiColumns, setAiColumns] = useState<CampaignColumn[]>([]);
  const [columnValues, setColumnValues] = useState<
    Record<string, Record<string, CampaignColumnValue>>
  >({});
  const [contactMeta, setContactMeta] = useState<Record<string, ContactRowMeta>>(
    {},
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CampaignColumn | null>(null);
  const [savingColumn, setSavingColumn] = useState(false);
  const [runningColumnId, setRunningColumnId] = useState<string | null>(null);
  const [columnNotice, setColumnNotice] = useState<string | null>(null);
  const [partialSaveNotice, setPartialSaveNotice] = useState<string | null>(null);
  const contactMetaRequestIds = useRef<Map<string, number>>(new Map());
  const contactMetaQueues = useRef<Map<string, Promise<void>>>(new Map());

  async function loadCampaign() {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(String(data.error ?? "Failed to load table"));
      }

      const loaded = data.campaign as CampaignWithContacts;
      setCampaign(loaded);
      setAllPeople(loaded.contacts ?? []);
      setAiColumns(loaded.columns ?? []);
      setColumnValues(loaded.columnValues ?? {});
      setContactMeta(loaded.contactMeta ?? {});
      setPage(1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/login?next=/campaigns/${campaignId}`);
        setError("Your session expired. Redirecting to sign in…");
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCampaign();
  }, [campaignId, router]);

  useEffect(() => {
    if (searchParams.get("partial") !== "1") return;
    const saved = Number(searchParams.get("saved") ?? 0);
    const target = Number(searchParams.get("target") ?? 0);
    if (saved > 0) {
      setPartialSaveNotice(
        target > saved
          ? `Saved ${saved.toLocaleString()} of ${target.toLocaleString()} contacts before a connection issue. You can continue saving more into this table from search.`
          : `Saved ${saved.toLocaleString()} contacts.`,
      );
    }
    router.replace(`/campaigns/${campaignId}`);
  }, [campaignId, router, searchParams]);

  function handlePeopleUpdate(updated: LeadPerson[]) {
    setAllPeople((current) => {
      const start = (page - 1) * SEARCH_RESULTS_PER_PAGE;
      const next = [...current];
      updated.forEach((person, index) => {
        next[start + index] = person;
      });
      return next;
    });
  }

  async function handleSaveColumn(input: { name: string; prompt: string }) {
    if (!campaignId) return;

    setSavingColumn(true);
    setError(null);

    try {
      const isEdit = Boolean(editingColumn);
      const url = isEdit
        ? `/api/campaigns/${campaignId}/columns/${editingColumn!.id}`
        : `/api/campaigns/${campaignId}/columns`;

      const { response, data } = await fetchJson(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(String(data.error ?? "Failed to save column"));
      }

      const column = data.column as CampaignColumn;
      setAiColumns((current) => {
        if (isEdit) {
          return current.map((item) => (item.id === column.id ? column : item));
        }
        return [...current, column];
      });

      if (isEdit) {
        setColumnValues((current) => {
          const next = { ...current };
          for (const personId of Object.keys(next)) {
            delete next[personId][column.id];
          }
          return next;
        });
      }

      setColumnModalOpen(false);
      setEditingColumn(null);
      setColumnNotice(
        isEdit
          ? `Updated column "${column.name}". Re-run it to refresh cells.`
          : `Added column "${column.name}". Select rows and click Run to fill it.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save column");
    } finally {
      setSavingColumn(false);
    }
  }

  async function handleDeleteColumn(columnId: string) {
    if (!campaignId) return;
    const column = aiColumns.find((item) => item.id === columnId);
    if (!column) return;
    if (!window.confirm(`Delete AI column "${column.name}"?`)) return;

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/columns/${columnId}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(String(data.error ?? "Failed to delete column"));
      }

      setAiColumns((current) => current.filter((item) => item.id !== columnId));
      setColumnValues((current) => {
        const next = { ...current };
        for (const personId of Object.keys(next)) {
          delete next[personId][columnId];
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete column");
    }
  }

  async function handleRunColumn(columnId: string, personIds: string[]) {
    if (!campaignId || personIds.length === 0) return;

    setRunningColumnId(columnId);
    setColumnNotice(null);
    setError(null);

    setColumnValues((current) => {
      const next = { ...current };
      for (const personId of personIds) {
        next[personId] = {
          ...(next[personId] ?? {}),
          [columnId]: {
            columnId,
            personId,
            value: null,
            status: "running",
            error: null,
            promptHash: "",
            updatedAt: new Date().toISOString(),
          },
        };
      }
      return next;
    });

    try {
      const { response, data } = await fetchJson(
        `/api/campaigns/${campaignId}/columns/${columnId}/enrich`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personIds }),
        },
      );

      if (!response.ok) {
        throw new Error(String(data.error ?? "AI column run failed"));
      }

      const results = (data.results ?? []) as Array<{
        personId: string;
        value: string | null;
        status: "done" | "error";
        error?: string;
      }>;

      const column = aiColumns.find((item) => item.id === columnId);

      setColumnValues((current) => {
        const next = { ...current };
        for (const result of results) {
          next[result.personId] = {
            ...(next[result.personId] ?? {}),
            [columnId]: {
              columnId,
              personId: result.personId,
              value: result.value,
              status: result.status,
              error: result.error ?? null,
              promptHash: column?.promptHash ?? "",
              updatedAt: new Date().toISOString(),
            },
          };
        }
        return next;
      });

      const successCount = results.filter((result) => result.status === "done").length;
      
      // Refresh token balance immediately after successful AI column enrichment
      const tokensDebited = Number(data.tokensDebited ?? 0);
      if (tokensDebited > 0) {
        notifyBillingBalanceRefresh();
      }
      
      setColumnNotice(
        `Filled ${successCount} of ${personIds.length} cells for "${column?.name ?? "column"}".`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setError("Not enough tokens. Visit Pricing to buy more.");
      } else {
        setError(err instanceof Error ? err.message : "AI column run failed");
      }

      setColumnValues((current) => {
        const next = { ...current };
        for (const personId of personIds) {
          const personValues = next[personId];
          if (!personValues?.[columnId]) continue;

          const { [columnId]: _removed, ...rest } = personValues;
          if (Object.keys(rest).length === 0) {
            delete next[personId];
          } else {
            next[personId] = rest;
          }
        }
        return next;
      });
    } finally {
      setRunningColumnId(null);
    }
  }

  function handleContactMetaUpdate(
    personId: string,
    updates: Partial<Pick<ContactRowMeta, "status" | "notes" | "rowColor" | "isDone">>,
  ) {
    if (!campaignId) return;

    const previous = contactMeta[personId];
    const requestId = (contactMetaRequestIds.current.get(personId) ?? 0) + 1;
    contactMetaRequestIds.current.set(personId, requestId);

    setContactMeta((current) => {
      const base = current[personId];
      return {
        ...current,
        [personId]: {
          personId,
          status: updates.status ?? base?.status ?? "not_contacted",
          notes: updates.notes ?? base?.notes ?? "",
          rowColor:
            updates.rowColor !== undefined
              ? updates.rowColor
              : (base?.rowColor ?? null),
          isDone: updates.isDone ?? base?.isDone ?? false,
          updatedAt: new Date().toISOString(),
        },
      };
    });

    // Saves for one contact run one at a time so rapid clicks land in order.
    const queued = (contactMetaQueues.current.get(personId) ?? Promise.resolve())
      .then(() => saveContactMeta(personId, updates, requestId, previous));
    contactMetaQueues.current.set(personId, queued);
  }

  async function saveContactMeta(
    personId: string,
    updates: Partial<Pick<ContactRowMeta, "status" | "notes" | "rowColor" | "isDone">>,
    requestId: number,
    previous: ContactRowMeta | undefined,
  ) {
    try {
      const { response, data } = await fetchJson(
        `/api/campaigns/${campaignId}/contacts/${encodeURIComponent(personId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        throw new Error(String(data.error ?? "Failed to save contact update"));
      }

      // A newer click for this contact already won — keep its state.
      if (contactMetaRequestIds.current.get(personId) !== requestId) return;

      const meta = data.meta as ContactRowMeta;
      setContactMeta((current) => ({
        ...current,
        [personId]: meta,
      }));
    } catch (err) {
      if (contactMetaRequestIds.current.get(personId) !== requestId) return;

      setContactMeta((current) => {
        if (!previous) {
          const next = { ...current };
          delete next[personId];
          return next;
        }
        return { ...current, [personId]: previous };
      });
      setError(err instanceof Error ? err.message : "Failed to save contact update");
    }
  }

  const visiblePeople = useMemo(() => {
    const start = (page - 1) * SEARCH_RESULTS_PER_PAGE;
    return allPeople.slice(start, start + SEARCH_RESULTS_PER_PAGE);
  }, [allPeople, page]);

  const totalPages = Math.max(
    1,
    Math.ceil(allPeople.length / SEARCH_RESULTS_PER_PAGE),
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-3 py-4 sm:px-4 lg:px-6">
        <div className="mx-auto max-w-screen-2xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            <span aria-hidden>←</span>
            Back to tables
          </Link>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {campaign?.name ?? "Table"}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {loading
                      ? "Loading…"
                      : `${allPeople.length.toLocaleString()} contacts`}
                  </span>
                  {aiColumns.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                      {aiColumns.length} AI column{aiColumns.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
              {campaign?.aiQuery && (
                <p className="mt-1.5 text-sm text-slate-500">
                  From AI search: “{campaign.aiQuery}”
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
              {!loading && allPeople.length > 0 && (
                <ExportContactsButton
                  people={allPeople}
                  contactMeta={contactMeta}
                  aiColumns={aiColumns}
                  columnValues={columnValues}
                  tableName={campaign?.name ?? "contacts"}
                />
              )}
              {campaign?.aiQuery && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                  <AISearchIconBadge size="sm" className="!h-5 !w-5 !rounded-md" />
                  AI Search
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl px-3 py-6 sm:px-4 lg:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {partialSaveNotice && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>{partialSaveNotice}</p>
            <button
              type="button"
              onClick={() => setPartialSaveNotice(null)}
              className="shrink-0 text-amber-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {columnNotice && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {columnNotice}
          </div>
        )}

        <LeadResults
          people={visiblePeople}
          totalEntries={allPeople.length}
          loading={loading}
          showEmptyState={!loading && allPeople.length === 0}
          searchFilters={campaign?.searchFilters ?? null}
          campaignId={campaignId}
          onPeopleUpdate={handlePeopleUpdate}
          enableEnrichment
          aiColumns={aiColumns}
          columnValues={columnValues}
          runningColumnId={runningColumnId}
          onAddColumn={() => {
            setEditingColumn(null);
            setColumnModalOpen(true);
          }}
          onRunColumn={handleRunColumn}
          onEditColumn={(column) => {
            setEditingColumn(column);
            setColumnModalOpen(true);
          }}
          onDeleteColumn={handleDeleteColumn}
          enableTracking
          contactMeta={contactMeta}
          onContactMetaUpdate={handleContactMetaUpdate}
        />

        {allPeople.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <AddAiColumnModal
        key={editingColumn?.id ?? "new"}
        open={columnModalOpen}
        saving={savingColumn}
        title={editingColumn ? "Edit AI column" : "Add AI column"}
        initialName={editingColumn?.name ?? ""}
        initialPrompt={editingColumn?.prompt ?? ""}
        onClose={() => {
          if (savingColumn) return;
          setColumnModalOpen(false);
          setEditingColumn(null);
        }}
        onSave={handleSaveColumn}
      />
    </div>
  );
}
