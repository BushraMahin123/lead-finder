"use client";

import { useEffect, useRef, useState } from "react";
import type { ContactRowMeta, ContactStatus, RowColor } from "@/types/campaign";

export const CONTACT_STATUS_OPTIONS: Array<{
  value: ContactStatus;
  label: string;
  pillClass: string;
  dotClass: string;
}> = [
  {
    value: "not_contacted",
    label: "Not contacted",
    pillClass: "bg-slate-100 text-slate-700 ring-slate-200/80",
    dotClass: "bg-slate-400",
  },
  {
    value: "contacted",
    label: "Contacted",
    pillClass: "bg-sky-100 text-sky-900 ring-sky-300/70",
    dotClass: "bg-sky-500",
  },
  {
    value: "replied",
    label: "Replied",
    pillClass: "bg-emerald-100 text-emerald-900 ring-emerald-300/70",
    dotClass: "bg-emerald-500",
  },
  {
    value: "meeting",
    label: "Meeting",
    pillClass: "bg-violet-100 text-violet-900 ring-violet-300/70",
    dotClass: "bg-violet-500",
  },
  {
    value: "no_response",
    label: "No response",
    pillClass: "bg-amber-100 text-amber-900 ring-amber-300/70",
    dotClass: "bg-amber-500",
  },
  {
    value: "not_interested",
    label: "Not interested",
    pillClass: "bg-rose-100 text-rose-900 ring-rose-300/70",
    dotClass: "bg-rose-500",
  },
  {
    value: "done",
    label: "Done",
    pillClass: "bg-emerald-200 text-emerald-950 ring-emerald-400/70",
    dotClass: "bg-emerald-600",
  },
];

export const ROW_COLOR_OPTIONS: Array<{
  value: RowColor | null;
  label: string;
  swatchClass: string;
  borderClass: string;
}> = [
  {
    value: null,
    label: "No color",
    swatchClass: "bg-white ring-1 ring-slate-200",
    borderClass: "border-l-transparent",
  },
  {
    value: "green",
    label: "Green",
    swatchClass: "bg-emerald-500",
    borderClass: "border-l-emerald-500",
  },
  {
    value: "yellow",
    label: "Yellow",
    swatchClass: "bg-amber-500",
    borderClass: "border-l-amber-500",
  },
  {
    value: "red",
    label: "Red",
    swatchClass: "bg-rose-500",
    borderClass: "border-l-rose-500",
  },
  {
    value: "blue",
    label: "Blue",
    swatchClass: "bg-sky-500",
    borderClass: "border-l-sky-500",
  },
  {
    value: "purple",
    label: "Purple",
    swatchClass: "bg-violet-500",
    borderClass: "border-l-violet-500",
  },
  {
    value: "orange",
    label: "Orange",
    swatchClass: "bg-orange-500",
    borderClass: "border-l-orange-500",
  },
  {
    value: "gray",
    label: "Gray",
    swatchClass: "bg-slate-500",
    borderClass: "border-l-slate-500",
  },
];

function getStatusOption(status: ContactStatus) {
  return (
    CONTACT_STATUS_OPTIONS.find((option) => option.value === status) ??
    CONTACT_STATUS_OPTIONS[0]
  );
}

function getColorOption(color: RowColor | null | undefined) {
  return (
    ROW_COLOR_OPTIONS.find((option) => option.value === color) ??
    ROW_COLOR_OPTIONS[0]
  );
}

export function rowLeftBorderClass(meta: ContactRowMeta | undefined): string {
  if (meta?.isDone || meta?.status === "done") {
    return "border-l-emerald-500";
  }
  return getColorOption(meta?.rowColor).borderClass;
}

export function rowBackgroundClass(
  meta: ContactRowMeta | undefined,
  selected: boolean,
): string {
  if (selected) {
    return "group bg-indigo-100/80 hover:bg-indigo-100";
  }

  if (meta?.isDone || meta?.status === "done") {
    return "group bg-slate-100 hover:bg-slate-100";
  }

  switch (meta?.rowColor) {
    case "green":
      return "group bg-emerald-100/90 hover:bg-emerald-100";
    case "yellow":
      return "group bg-amber-100/90 hover:bg-amber-100";
    case "red":
      return "group bg-rose-100/90 hover:bg-rose-100";
    case "blue":
      return "group bg-sky-100/90 hover:bg-sky-100";
    case "purple":
      return "group bg-violet-100/90 hover:bg-violet-100";
    case "orange":
      return "group bg-orange-100/90 hover:bg-orange-100";
    case "gray":
      return "group bg-slate-200/70 hover:bg-slate-200/80";
    default:
      return "group hover:bg-slate-50/80";
  }
}

export function stickyCellBackground(
  meta: ContactRowMeta | undefined,
  selected: boolean,
): string {
  if (selected) return "bg-indigo-100/90 group-hover:bg-indigo-100";
  if (meta?.isDone || meta?.status === "done") {
    return "bg-slate-100 group-hover:bg-slate-100";
  }

  switch (meta?.rowColor) {
    case "green":
      return "bg-emerald-100/90 group-hover:bg-emerald-100";
    case "yellow":
      return "bg-amber-100/90 group-hover:bg-amber-100";
    case "red":
      return "bg-rose-100/90 group-hover:bg-rose-100";
    case "blue":
      return "bg-sky-100/90 group-hover:bg-sky-100";
    case "purple":
      return "bg-violet-100/90 group-hover:bg-violet-100";
    case "orange":
      return "bg-orange-100/90 group-hover:bg-orange-100";
    case "gray":
      return "bg-slate-200/70 group-hover:bg-slate-200/80";
    default:
      return "bg-white group-hover:bg-slate-50";
  }
}

interface ContactRowColorPickerProps {
  value: RowColor | null;
  onChange: (color: RowColor | null) => void;
}

export function ContactRowColorPicker({
  value,
  onChange,
}: ContactRowColorPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = getColorOption(value);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-600 hover:shadow-sm"
        title="Row color"
        aria-label="Change row color"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path
            fillRule="evenodd"
            d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V3.75a.75.75 0 00-1.5 0v2.25a.75.75 0 00.22.53l2.25 2.25a.75.75 0 101.06-1.06l-2.25-2.25z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 w-44 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Row color
          </p>
          <div className="grid grid-cols-4 gap-2">
            {ROW_COLOR_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                title={option.label}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`h-6 w-6 rounded-full transition hover:scale-110 ${option.swatchClass} ${
                  option.value === value
                    ? "ring-2 ring-indigo-500 ring-offset-2"
                    : ""
                }`}
              />
            ))}
          </div>
          <p className="mt-2 px-1 text-[11px] text-slate-400">{active.label}</p>
        </div>
      )}
    </div>
  );
}

interface ContactDoneToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function ContactDoneToggle({
  checked,
  onChange,
  label,
}: ContactDoneToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-label={checked ? `Mark ${label} as not done` : `Mark ${label} as done`}
      title={checked ? "Mark as not done" : "Mark as done"}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
        checked
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
          : "border-slate-300 bg-white text-transparent hover:border-emerald-400 hover:bg-emerald-50"
      }`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

interface ContactStatusSelectProps {
  value: ContactStatus;
  onChange: (status: ContactStatus) => void;
}

export function ContactStatusSelect({
  value,
  onChange,
}: ContactStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = getStatusOption(value);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-[8.5rem]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex w-full items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:shadow-sm ${active.pillClass}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active.dotClass}`} />
        <span className="truncate">{active.label}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`ml-auto h-3.5 w-3.5 shrink-0 opacity-60 transition ${open ? "rotate-180" : ""}`}
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
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {CONTACT_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                option.value === value ? "bg-slate-50" : ""
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${option.dotClass}`} />
              <span className="text-slate-700">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ContactNotesInputProps {
  value: string;
  onChange: (notes: string) => void;
}

export function ContactNotesInput({ value, onChange }: ContactNotesInputProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function scheduleSave(next: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onChange(next), 500);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`relative min-w-[11rem] rounded-lg transition ${
        focused
          ? "bg-white shadow-sm ring-2 ring-indigo-100"
          : draft
            ? "bg-white/80 ring-1 ring-slate-200/80"
            : "bg-slate-50/80 ring-1 ring-transparent hover:ring-slate-200/80"
      }`}
    >
      <input
        type="text"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          scheduleSave(next);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (draft !== value) onChange(draft);
        }}
        placeholder="Add response or notes…"
        className="w-full bg-transparent px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

interface ContactTrackingCellProps {
  personLabel: string;
  meta: ContactRowMeta | undefined;
  onMetaUpdate: (
    updates: Partial<Pick<ContactRowMeta, "status" | "notes" | "rowColor" | "isDone">>,
  ) => void;
}

export function ContactTrackingCell({
  personLabel,
  meta,
  onMetaUpdate,
}: ContactTrackingCellProps) {
  return (
    <div className="flex min-w-[13rem] items-center gap-1.5">
      <ContactRowColorPicker
        value={meta?.rowColor ?? null}
        onChange={(rowColor) => onMetaUpdate({ rowColor })}
      />
      <ContactDoneToggle
        checked={meta?.isDone ?? false}
        label={personLabel}
        onChange={(isDone) =>
          onMetaUpdate({
            isDone,
            status: isDone
              ? "done"
              : meta?.status === "done"
                ? "contacted"
                : (meta?.status ?? "not_contacted"),
          })
        }
      />
      <ContactStatusSelect
        value={meta?.status ?? "not_contacted"}
        onChange={(status) =>
          onMetaUpdate({
            status,
            isDone: status === "done",
          })
        }
      />
    </div>
  );
}
