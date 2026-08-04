"use client";

import { useState } from "react";
import type { AdminTelnyxBillingSummary } from "@/lib/admin-types";

function money(
  amount: number | null | undefined,
  currency = "USD",
  digits = 2,
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(digits)}`;
  }
}

type AdminTelnyxBillingProps = {
  initialSummary: AdminTelnyxBillingSummary;
};

export default function AdminTelnyxBilling({
  initialSummary,
}: AdminTelnyxBillingProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/telnyx/billing", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        summary?: AdminTelnyxBillingSummary;
        error?: string;
      };
      if (!response.ok || !payload.summary) {
        throw new Error(payload.error || "Failed to refresh Telnyx billing");
      }
      setSummary(payload.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setLoading(false);
    }
  }

  const currency = summary.balance?.currency ?? "USD";
  const sampleCurrency = summary.sampleNumberPricing?.currency ?? currency;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Calling provider costs
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Live account balance, number sticker prices, and what LEADMAGPRO
            charges customers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {summary.errors.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Some Telnyx data could not load</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {summary.errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!summary.configured ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Set <code className="rounded bg-slate-100 px-1">TELNYX_API_KEY</code>{" "}
          to load live balance and number costs.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-flat p-5">
          <p className="text-sm font-medium text-slate-500">Account balance</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {money(summary.balance?.balance, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Funds left on Telnyx</p>
        </div>
        <div className="card-flat p-5">
          <p className="text-sm font-medium text-slate-500">Available credit</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {money(summary.balance?.availableCredit, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Balance + credit limit ({money(summary.balance?.creditLimit, currency)})
          </p>
        </div>
        <div className="card-flat p-5">
          <p className="text-sm font-medium text-slate-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {money(summary.balance?.pending, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Not yet settled</p>
        </div>
        <div className="card-flat p-5">
          <p className="text-sm font-medium text-slate-500">Numbers on Telnyx</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary.ownedOnTelnyx?.totalCount?.toLocaleString() ?? "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">On this API account</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-flat overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">
              What a number costs (Telnyx)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Live sample of available US local numbers right now.
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Monthly
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {money(summary.sampleNumberPricing?.monthlyAvg, sampleCurrency)}{" "}
                <span className="text-sm font-normal text-slate-500">avg</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Range{" "}
                {money(summary.sampleNumberPricing?.monthlyMin, sampleCurrency)}{" "}
                –{" "}
                {money(summary.sampleNumberPricing?.monthlyMax, sampleCurrency)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Upfront / one-time
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {money(summary.sampleNumberPricing?.upfrontAvg, sampleCurrency)}{" "}
                <span className="text-sm font-normal text-slate-500">avg</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Range{" "}
                {money(summary.sampleNumberPricing?.upfrontMin, sampleCurrency)}{" "}
                –{" "}
                {money(summary.sampleNumberPricing?.upfrontMax, sampleCurrency)}
              </p>
            </div>
          </div>
          {summary.sampleNumberPricing &&
          summary.sampleNumberPricing.samples.length > 0 ? (
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Number</th>
                    <th className="px-4 py-2 font-medium">Monthly</th>
                    <th className="px-4 py-2 font-medium">Upfront</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.sampleNumberPricing.samples.map((sample) => (
                    <tr key={sample.phoneNumber}>
                      <td className="px-4 py-2 font-mono text-slate-800">
                        {sample.phoneNumber}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {money(sample.monthlyCost, sampleCurrency)}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {money(sample.upfrontCost, sampleCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="card-flat overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">
              What we charge customers
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Unlimited calling package vs Telnyx number COGS.
            </p>
          </div>
          <dl className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Calling package / month</dt>
              <dd className="font-semibold text-slate-900">
                {money(summary.customerPricing.callingMonthlyUsd)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-600">Phone number fee (one-time)</dt>
              <dd className="font-semibold text-slate-900">
                {money(summary.customerPricing.numberFeeOneTimeUsd)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <dt className="font-medium text-slate-800">First payment shown</dt>
              <dd className="font-bold text-slate-900">
                {money(summary.customerPricing.firstPaymentUsd)}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs text-slate-600">
              Margin check: customer pays{" "}
              <strong>
                {money(summary.customerPricing.numberFeeOneTimeUsd)}
              </strong>{" "}
              once for a number; Telnyx typically charges ~{" "}
              <strong>
                {money(summary.sampleNumberPricing?.upfrontAvg, sampleCurrency)}
              </strong>{" "}
              upfront and ~{" "}
              <strong>
                {money(summary.sampleNumberPricing?.monthlyAvg, sampleCurrency)}
              </strong>
              /mo for the number itself (plus voice usage).
            </div>
          </dl>

          <div className="border-t border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">
              Numbers in LEADMAGPRO
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Active</dt>
                <dd className="font-medium text-slate-900">
                  {summary.inventory.activeNumbers}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Pending</dt>
                <dd className="font-medium text-slate-900">
                  {summary.inventory.pendingNumbers}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Est. monthly number COGS</dt>
                <dd className="font-medium text-slate-900">
                  {money(summary.inventory.totalMonthlyCost)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Recorded upfront COGS</dt>
                <dd className="font-medium text-slate-900">
                  {money(summary.inventory.totalUpfrontCost)}
                </dd>
              </div>
              {summary.inventory.numbersMissingCost > 0 ? (
                <p className="pt-1 text-xs text-amber-700">
                  {summary.inventory.numbersMissingCost} number(s) missing stored
                  cost data.
                </p>
              ) : null}
            </dl>
          </div>
        </div>
      </div>

      {summary.ownedOnTelnyx && summary.ownedOnTelnyx.preview.length > 0 ? (
        <div className="card-flat overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">
              Telnyx account numbers (preview)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Number</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.ownedOnTelnyx.preview.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 font-mono text-slate-800">
                      {row.phoneNumber}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {row.status ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
