"use client";

import { useState } from "react";
import {
  FREE_LIFETIME_TOKENS,
  OVERAGE_RATE,
  SUBSCRIPTION_PLANS,
  TOP_UP_PACKS,
  type PlanId,
  type TopUpId,
} from "@/lib/billing/plans";
import {
  ANNUAL_DISCOUNT,
  getDisplayPrice,
  PLAN_COMPARISON,
} from "@/lib/billing/plan-comparison";
import { TOKEN_RATES } from "@/lib/billing/token-rates";
import { useBillingBalance } from "@/hooks/useBillingBalance";

export default function PricingContent() {
  const { balance } = useBillingBalance();
  const [annual, setAnnual] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(type: "subscription" | "topup", id: string) {
    setLoadingCheckout(`${type}:${id}`);
    setError(null);

    try {
      const body =
        type === "subscription"
          ? { type, planId: id as PlanId }
          : { type, packId: id as TopUpId };

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(String(data.error ?? "Checkout failed"));
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Checkout URL was not returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoadingCheckout(null);
    }
  }

  async function openPortal() {
    setLoadingCheckout("portal");
    setError(null);

    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(String(data.error ?? "Could not open billing portal"));
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Billing portal failed");
    } finally {
      setLoadingCheckout(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <section className="border-b border-slate-200/80 bg-white/80 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="section-label">Billing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Pricing & tokens
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            Pay for what you use. Cached searches and saved enrichments are free.
            One token ≈ $0.01.
          </p>

          <div className="mt-8 flex flex-col items-start gap-4">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  !annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                Annually
                <span className="badge-success text-[10px]">
                  Save {Math.round(ANNUAL_DISCOUNT * 100)}%
                </span>
              </button>
            </div>

            {balance && (
              <p className="text-sm text-slate-700">
                Current balance:{" "}
                <span className="font-semibold">
                  {balance.balance.toLocaleString()} tokens
                </span>{" "}
                · {balance.planName} plan
              </p>
            )}

            {balance?.planId !== "free" && (
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={loadingCheckout === "portal"}
                className="btn btn-secondary disabled:opacity-50"
              >
                Manage subscription
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {error && <div className="alert-error mb-6">{error}</div>}

        <div className="card mb-10 p-6">
          <h2 className="text-lg font-semibold">Token usage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <TokenRate label="Lead viewed" rate={`${TOKEN_RATES.lead} token`} />
            <TokenRate label="Email reveal" rate={`${TOKEN_RATES.email} tokens`} />
            <TokenRate label="Phone reveal" rate={`${TOKEN_RATES.phone} tokens`} />
          </div>
        </div>

        <h2 className="mb-6 text-xl font-semibold">Plans</h2>
        <div className="grid items-end gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const displayPrice = getDisplayPrice(plan.priceMonthly, annual);
            const isPopular = plan.highlighted;

            return (
              <div
                key={plan.id}
                className={`card-flat relative flex flex-col p-5 ${
                  isPopular ? "plan-popular bg-indigo-50/30 ring-2 ring-indigo-200" : ""
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-semibold">{plan.name}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {displayPrice === 0 ? "$0" : `$${displayPrice}`}
                  {displayPrice > 0 && (
                    <span className="text-sm font-normal text-slate-500">
                      /mo{annual ? " billed yearly" : ""}
                    </span>
                  )}
                </p>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-indigo-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex-1" />
                {plan.id === "free" ? (
                  <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
                    {FREE_LIFETIME_TOKENS} tokens once at signup
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startCheckout("subscription", plan.id)}
                    disabled={loadingCheckout === `subscription:${plan.id}`}
                    className={`btn mt-4 w-full py-2.5 disabled:opacity-50 ${
                      isPopular ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    {loadingCheckout === `subscription:${plan.id}`
                      ? "Redirecting…"
                      : "Subscribe"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <h2 className="mb-4 mt-14 text-xl font-semibold">Compare plans</h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Feature</th>
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <th
                      key={plan.id}
                      className={`px-4 py-3 font-semibold ${
                        plan.highlighted ? "bg-indigo-50 text-indigo-700" : ""
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PLAN_COMPARISON.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {row.label}
                    </td>
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <td
                        key={plan.id}
                        className={`px-4 py-3 text-slate-600 ${
                          plan.highlighted ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <ComparisonCell value={row.values[plan.id]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <h2 className="mb-4 mt-10 text-xl font-semibold">Top-up packs</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TOP_UP_PACKS.map((pack) => (
            <div key={pack.id} className="card-flat p-5">
              <p className="text-sm font-semibold">{pack.name}</p>
              <p className="mt-2 text-2xl font-bold">${pack.price}</p>
              <p className="mt-1 text-sm text-slate-600">
                {pack.tokens.toLocaleString()} tokens
              </p>
              <button
                type="button"
                onClick={() => void startCheckout("topup", pack.id)}
                disabled={loadingCheckout === `topup:${pack.id}`}
                className="btn btn-secondary mt-4 w-full disabled:opacity-50"
              >
                {loadingCheckout === `topup:${pack.id}` ? "Redirecting…" : "Buy pack"}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Overage on paid plans: ${OVERAGE_RATE.priceUsd} per{" "}
          {OVERAGE_RATE.tokensPerThousand.toLocaleString()} tokens.
          {annual && ` Annual pricing reflects a ${Math.round(ANNUAL_DISCOUNT * 100)}% discount on displayed monthly rates.`}
        </p>
      </section>
    </div>
  );
}

function TokenRate({ label, rate }: { label: string; rate: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-100">
      <p className="font-medium text-slate-900">{label}</p>
      <p className="mt-1 text-slate-600">{rate}</p>
    </div>
  );
}

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="font-semibold text-emerald-600">✓</span>
    ) : (
      <span className="text-slate-300">—</span>
    );
  }
  return <span>{value}</span>;
}
