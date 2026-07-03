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
  const maxCount = Math.min(maxAvailable, 10_000);
  const [amount, setAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [enrichEmail, setEnrichEmail] = useState(true);
  const [enrichPhone, setEnrichPhone] = useState(true);
  const { balance, refresh } = useBillingBalance();

  useEffect(() => {
    if (!open) return;
    void refresh();
    const initial = clampSaveCount(
      Math.min(100, maxCount),
      maxCount,
    );
    setAmount(String(initial));
    setSelectedPreset(SAVE_AMOUNT_PRESETS.includes(initial as (typeof SAVE_AMOUNT_PRESETS)[number]) ? initial : null);
    setEnrichEmail(true);
    setEnrichPhone(true);
  }, [open, maxCount, refresh]);

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
            Please confirm details before creating table.
          </p>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Select amount{" "}
              <span className="font-normal text-slate-500">
                (max {maxCount.toLocaleString()})
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

            <div className="mt-3 flex flex-wrap gap-2">
              {SAVE_AMOUNT_PRESETS.map((preset) => {
                const disabled = preset > maxCount;
                const active = selectedPreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={disabled}
                    onClick={() => handlePreset(preset)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : disabled
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-slate-900">Summary</p>

            {insufficientCredits && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">Oops! Looks like you don&apos;t have enough credits…</p>
                <p className="mt-1 text-amber-800">
                  You need{" "}
                  <CreditAmount value={credits.total - availableCredits} /> more tokens
                  for this selection. Deselect paid options or{" "}
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
