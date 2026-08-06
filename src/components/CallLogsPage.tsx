"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconSearch } from "@/components/icons";
import { ApiError, fetchJson } from "@/lib/fetch-json";
import type { CallLog, TranscriptionStatus } from "@/types/dialer";

type RecordingDetail = {
  recordingUrl: string | null;
  transcript: string | null;
  transcriptionStatus: string | null;
  transcriptionError: string | null;
};

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(call: CallLog): string {
  if (call.disposition) {
    return call.disposition.replace(/_/g, " ");
  }
  return call.status;
}

function transcriptionBadge(
  status: TranscriptionStatus | null,
  hasRecording: boolean,
) {
  if (!hasRecording) {
    return <span className="text-xs text-slate-400">No recording</span>;
  }
  switch (status) {
    case "completed":
      return (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Transcribed
        </span>
      );
    case "failed":
      return (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Transcript failed
        </span>
      );
    case "processing":
    case "pending":
      return (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
          Processing
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          Recording
        </span>
      );
  }
}

export default function CallLogsPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, RecordingDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<Record<string, string>>({});

  const loadCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, data } = await fetchJson<{
        calls?: CallLog[];
        error?: string;
      }>("/api/dialer/calls?limit=100");
      if (!response.ok) {
        throw new ApiError(
          data.error ?? "Failed to load call logs",
          response.status,
        );
      }
      setCalls(data.calls ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load call logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalls();
  }, [loadCalls]);

  const filteredCalls = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return calls;

    const digitsQuery = query.replace(/\D/g, "");

    return calls.filter((call) => {
      const haystack = [
        call.personName,
        call.toNumber,
        call.fromNumber,
        call.status,
        call.disposition,
        call.transcript,
        call.errorMessage,
        statusLabel(call),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (haystack.includes(query)) return true;

      if (digitsQuery.length >= 3) {
        const phoneDigits = `${call.toNumber ?? ""}${call.fromNumber ?? ""}`.replace(
          /\D/g,
          "",
        );
        if (phoneDigits.includes(digitsQuery)) return true;
      }

      return false;
    });
  }, [calls, searchQuery]);

  async function toggleExpand(call: CallLog) {
    if (expandedId === call.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(call.id);

    if (!call.recordingPath && !call.transcript) {
      return;
    }

    if (details[call.id]) return;

    setLoadingDetailId(call.id);
    setDetailError((prev) => {
      const next = { ...prev };
      delete next[call.id];
      return next;
    });

    try {
      const { response, data } = await fetchJson<{
        call?: RecordingDetail & { id: string };
        error?: string;
      }>(`/api/dialer/calls/${call.id}/recording`);

      if (!response.ok) {
        throw new ApiError(
          data.error ?? "Failed to load recording",
          response.status,
        );
      }

      setDetails((prev) => ({
        ...prev,
        [call.id]: {
          recordingUrl: data.call?.recordingUrl ?? null,
          transcript: data.call?.transcript ?? call.transcript,
          transcriptionStatus:
            data.call?.transcriptionStatus ?? call.transcriptionStatus,
          transcriptionError:
            data.call?.transcriptionError ?? call.transcriptionError,
        },
      }));
    } catch (err) {
      setDetailError((prev) => ({
        ...prev,
        [call.id]:
          err instanceof Error ? err.message : "Failed to load recording",
      }));
    } finally {
      setLoadingDetailId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="section-label">Dialer</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Call logs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review past calls, play recordings, and read transcripts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCalls()}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && calls.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {searchQuery.trim()
              ? `${filteredCalls.length} of ${calls.length} call${calls.length === 1 ? "" : "s"}`
              : `${calls.length} call${calls.length === 1 ? "" : "s"}`}
          </p>
          <label className="w-full sm:w-72 lg:w-80">
            <span className="sr-only">Search call logs</span>
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              <IconSearch className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, number, status…"
                className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>
        </div>
      ) : null}

      <section className={`card-flat overflow-hidden ${calls.length > 0 && !loading ? "mt-4" : "mt-8"}`}>
        {loading ? (
          <p className="px-6 py-10 text-sm text-slate-500">Loading call logs…</p>
        ) : calls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">No calls yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Place a call from the dialer and recordings will show up here.
            </p>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">No matching calls</p>
            <p className="mt-1 text-sm text-slate-500">
              Try a different name, phone number, or status.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredCalls.map((call) => {
              const open = expandedId === call.id;
              const detail = details[call.id];
              const hasRecording = Boolean(call.recordingPath);
              const transcriptText =
                detail?.transcript ?? call.transcript ?? null;

              return (
                <li key={call.id}>
                  <button
                    type="button"
                    onClick={() => void toggleExpand(call)}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left hover:bg-slate-50/80 sm:px-6"
                  >
                    <div className="min-w-[9rem] flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {call.personName || call.toNumber}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        {call.personName ? call.toNumber : null}
                        {call.personName ? " · " : null}
                        {formatWhen(call.createdAt)}
                      </p>
                    </div>
                    <span className="capitalize text-sm text-slate-600">
                      {statusLabel(call)}
                    </span>
                    <span className="tabular-nums text-sm text-slate-600">
                      {formatDuration(call.durationSeconds)}
                    </span>
                    <span className="flex items-center gap-2">
                      {transcriptionBadge(
                        call.transcriptionStatus,
                        hasRecording,
                      )}
                      <span className="text-slate-400" aria-hidden>
                        {open ? "▾" : "▸"}
                      </span>
                    </span>
                  </button>

                  {open ? (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-6">
                      {loadingDetailId === call.id ? (
                        <p className="text-sm text-slate-500">
                          Loading recording…
                        </p>
                      ) : null}

                      {detailError[call.id] ? (
                        <p className="text-sm text-red-600">
                          {detailError[call.id]}
                        </p>
                      ) : null}

                      {!hasRecording && !transcriptText ? (
                        <p className="text-sm text-slate-500">
                          No recording or transcript for this call.
                          {call.errorMessage ? ` ${call.errorMessage}` : ""}
                        </p>
                      ) : null}

                      {detail?.recordingUrl ? (
                        <audio
                          controls
                          src={detail.recordingUrl}
                          className="w-full max-w-xl"
                          preload="metadata"
                        />
                      ) : null}

                      {hasRecording &&
                      !detail?.recordingUrl &&
                      loadingDetailId !== call.id &&
                      !detailError[call.id] ? (
                        <p className="text-sm text-slate-500">
                          Recording unavailable.
                        </p>
                      ) : null}

                      {transcriptText ? (
                        <div className="mt-3 max-w-3xl">
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Transcript
                          </p>
                          <p className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-relaxed text-slate-700">
                            {transcriptText}
                          </p>
                        </div>
                      ) : null}

                      {(detail?.transcriptionError ||
                        call.transcriptionError) &&
                      !transcriptText ? (
                        <p className="mt-2 text-sm text-amber-800">
                          {detail?.transcriptionError ??
                            call.transcriptionError}
                        </p>
                      ) : null}

                      {call.fromNumber ? (
                        <p className="mt-3 text-xs text-slate-500">
                          From {call.fromNumber}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
