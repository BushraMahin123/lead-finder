"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useBillingBalance } from "@/hooks/useBillingBalance";
import {
  calculateSaveCredits,
  clampSaveCount,
  CREDIT_RATES,
  formatCredits,
  SAVE_AMOUNT_PRESETS,
  SAVE_CONTACTS_PER_REQUEST,
} from "@/lib/save-contacts-config";

export interface SaveContactsConfirmPayload {
  contactCount: number;
  enrichEmail: boolean;
  enrichPhone: boolean;
}

interface SaveContactsModalProps {
  open: boolean;
  maxAvailable: number;
  onClose: () => void;
  onConfirm: (payload: SaveContactsConfirmPayload) => void;
}

function CreditAmount({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      {formatCredits(value)}
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[10px] text-amber-700"
        aria-hidden
      >
        ◉
      </span>
    </span>
  );
}

export default function SaveContactsModal({
  open,
  maxAvailable,
  onClose,
  onConfirm,
}: SaveContactsModalProps) {
  const maxCount = Math.max(
    1,
    Math.min(Math.floor(maxAvailable), SAVE_CONTACTS_PER_REQUEST),
  );
  const [amount, setAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [enrichEmail, setEnrichEmail] = useState(true);
  const [enrichPhone, setEnrichPhone] = useState(true);
  const { balance, refresh } = useBillingBalance();

  const presets = useMemo(() => {
    const values = SAVE_AMOUNT_PRESETS.filter((preset) => preset < maxCount);
    return [...values, maxCount];
  }, [maxCount]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const initial = clampSaveCount(Math.min(100, maxCount), maxCount);
    setAmount(String(initial));
    setSelectedPreset(presets.includes(initial) ? initial : null);
    setEnrichEmail(true);
    setEnrichPhone(true);
  }, [open, maxCount, presets, refresh]);

  const parsedAmount = useMemo(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return clampSaveCount(value, maxCount);
  }, [amount, maxCount]);

  const credits = useMemo(
    () => calculateSaveCredits(parsedAmount, enrichEmail, enrichPhone),
    [parsedAmount, enrichEmail, enrichPhone],
  );

  const availableCredits = balance?.balance ?? 0;
  const insufficientCredits =
    parsedAmount > 0 && credits.total > availableCredits;
  const canContinue = parsedAmount > 0 && !insufficientCredits;
  const amountExceedsMatches =
    Number(amount) > maxCount && Number.isFinite(Number(amount));
  const amountExceedsSingleSaveLimit =
    Number(amount) > SAVE_CONTACTS_PER_REQUEST &&
    Number.isFinite(Number(amount)) &&
    Math.floor(maxAvailable) > SAVE_CONTACTS_PER_REQUEST;

  if (!open) return null;

  function handlePreset(preset: number) {
    if (preset > maxCount) return;
    setSelectedPreset(preset);
    setAmount(String(preset));
  }

  function handleAmountChange(value: string) {
    setSelectedPreset(null);
    setAmount(value.replace(/[^\d]/g, ""));
  }

  function handleConfirm() {
    if (!canContinue) return;
    onConfirm({
      contactCount: parsedAmount,
      enrichEmail,
      enrichPhone,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close save contacts dialog"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-contacts-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 px-6 py-5 text-center">
          <h2 id="save-contacts-title" className="text-xl font-semibold text-slate-900">
            Save contacts
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            You can save up to {SAVE_CONTACTS_PER_REQUEST.toLocaleString()} contacts
            at a time. Save again into the same table to continue with the next batch.
          </p>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Select amount{" "}
              <span className="font-normal text-slate-500">
                ({maxCount.toLocaleString()} available)
              </span>
            </p>
            <label className="mt-3 block text-xs text-slate-500">
              Enter amounts of contacts to save
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder="Enter amount"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            {amountExceedsMatches && (
              <p className="mt-1.5 text-xs text-amber-700">
                Only {Math.floor(maxAvailable).toLocaleString()} contacts match this search.
                Amount will be capped to {maxCount.toLocaleString()}.
              </p>
            )}
            {amountExceedsSingleSaveLimit && (
              <p className="mt-1.5 text-xs text-slate-500">
                Each save is limited to {SAVE_CONTACTS_PER_REQUEST.toLocaleString()} contacts.
                Save again into the same table to continue from the next contacts.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map((preset) => {
                const active = selectedPreset === preset;
                const isAll = preset === maxCount;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {isAll ? `All (${preset.toLocaleString()})` : preset.toLocaleString()}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-slate-900">Summary</p>

            {insufficientCredits && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">
                  Not enough tokens to save {parsedAmount.toLocaleString()} contacts
                </p>
                <p className="mt-1 text-amber-800">
                  You need{" "}
                  <CreditAmount value={credits.total - availableCredits} /> more
                  tokens for this selection. Lower the amount, turn off paid
                  enrichment, or{" "}
                  <Link href="/pricing" className="font-medium underline">
                    upgrade your plan
                  </Link>
                  .
                </p>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 text-slate-600">
                <span>
                  Find contacts{" "}
                  <span className="text-slate-400">
                    {CREDIT_RATES.lead} ◉ / contact
                  </span>
                </span>
                <CreditAmount value={credits.contacts} />
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={enrichEmail}
                    onChange={(event) => setEnrichEmail(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  Find email address
                  <span className="text-slate-400">
                    {CREDIT_RATES.email} ◉ / contact
                  </span>
                </span>
                <CreditAmount value={credits.email} />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={enrichPhone}
                    onChange={(event) => setEnrichPhone(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  Find mobile numbers
                  <span className="text-slate-400">
                    {CREDIT_RATES.phone} ◉ / contact
                  </span>
                </span>
                <CreditAmount value={credits.phone} />
              </label>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 font-medium text-slate-900">
                <span>Total tokens</span>
                <CreditAmount value={credits.total} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canContinue}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
