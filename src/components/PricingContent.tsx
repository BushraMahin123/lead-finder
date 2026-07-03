"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FREE_LIFETIME_TOKENS,
  OVERAGE_RATE,
  SUBSCRIPTION_PLANS,
  TOP_UP_PACKS,
  type PlanId,
  type TopUpId,
} from "@/lib/billing/plans";
import { TOKEN_RATES } from "@/lib/billing/token-rates";
import { useBillingBalance } from "@/hooks/useBillingBalance";

export default function PricingContent() {
  const { balance, refresh } = useBillingBalance();
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
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Pricing & tokens
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Pay for what you use. Cached searches and saved enrichments are free.
            One token ≈ $0.01.
          </p>
          {balance && (
            <p className="mt-4 text-sm text-slate-700">
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
              className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Manage subscription
            </button>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Token usage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">Lead viewed</p>
              <p className="mt-1 text-slate-600">{TOKEN_RATES.lead} token</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">Email reveal</p>
              <p className="mt-1 text-slate-600">{TOKEN_RATES.email} tokens</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">Phone reveal</p>
              <p className="mt-1 text-slate-600">{TOKEN_RATES.phone} tokens</p>
            </div>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-bold text-slate-900">Plans</h2>
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                plan.highlighted
                  ? "border-indigo-300 ring-2 ring-indigo-100"
                  : "border-slate-200"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {plan.priceMonthly === 0 ? "$0" : `$${plan.priceMonthly}`}
                {plan.priceMonthly > 0 && (
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                )}
              </p>
              <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
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
                  className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {loadingCheckout === `subscription:${plan.id}`
                    ? "Redirecting…"
                    : "Subscribe"}
                </button>
              )}
            </div>
          ))}
        </div>

        <h2 className="mb-4 mt-10 text-xl font-bold text-slate-900">Top-up packs</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {TOP_UP_PACKS.map((pack) => (
            <div
              key={pack.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900">{pack.name}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">${pack.price}</p>
              <p className="mt-1 text-sm text-slate-600">
                {pack.tokens.toLocaleString()} tokens
              </p>
              <button
                type="button"
                onClick={() => void startCheckout("topup", pack.id)}
                disabled={loadingCheckout === `topup:${pack.id}`}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingCheckout === `topup:${pack.id}` ? "Redirecting…" : "Buy pack"}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Overage on paid plans: ${OVERAGE_RATE.priceUsd} per{" "}
          {OVERAGE_RATE.tokensPerThousand.toLocaleString()} tokens.
        </p>
      </section>
    </div>
  );
}
