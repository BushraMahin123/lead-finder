"use client";

import { useEffect, useRef, useState } from "react";
import { exportContacts, type ExportFormat } from "@/lib/export-contacts";
import type {
  CampaignColumn,
  CampaignColumnValue,
  ContactRowMeta,
} from "@/types/campaign";
import type { LeadPerson } from "@/types/lead";

interface ExportContactsButtonProps {
  people: LeadPerson[];
  contactMeta?: Record<string, ContactRowMeta>;
  aiColumns?: CampaignColumn[];
  columnValues?: Record<string, Record<string, CampaignColumnValue>>;
  tableName?: string;
  disabled?: boolean;
}

export default function ExportContactsButton({
  people,
  contactMeta,
  aiColumns,
  columnValues,
  tableName,
  disabled = false,
}: ExportContactsButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleExport(format: ExportFormat) {
    setError(null);
    setExporting(true);
    try {
      exportContacts({
        people,
        contactMeta,
        aiColumns,
        columnValues,
        tableName,
        format,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const isDisabled = disabled || people.length === 0 || exporting;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 text-slate-500"
          aria-hidden
        >
          <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.69L6.3 8.49a.75.75 0 00-1.1 1.02l4.25 4.5a.75.75 0 001.1 0l4.25-4.5a.75.75 0 10-1.1-1.02l-2.95 3.12V2.75z" />
          <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
        </svg>
        {exporting ? "Exporting…" : "Export"}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl lg:right-0 lg:w-52 left-0 right-0 w-full lg:w-auto lg:left-auto max-w-[280px] lg:max-w-none">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="flex w-full flex-col items-start px-3.5 py-2.5 text-left transition hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-800">CSV</span>
            <span className="text-xs text-slate-500">Comma-separated .csv</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport("excel")}
            className="flex w-full flex-col items-start px-3.5 py-2.5 text-left transition hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-800">Excel</span>
            <span className="text-xs text-slate-500">Spreadsheet .xls</span>
          </button>
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-1 w-52 text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
