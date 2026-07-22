"use client";

import { useState } from "react";
import {
  FREE_LIFETIME_TOKENS,
  OVERAGE_RATE,
  SUBSCRIPTION_PLANS,
  TOP_UP_PACKS,
  getPlanCardAction,
  hasPurchasedPlan,
  type PlanId,
  type TopUpId,
} from "@/lib/billing/plans";
import {
  ANNUAL_DISCOUNT,
  getDisplayPrice,
  PLAN_COMPARISON,
} from "@/lib/billing/plan-comparison";
import { TOKEN_RATES } from "@/lib/billing/token-rates";
import { useBillingBalance, notifyBillingBalanceRefresh } from "@/hooks/useBillingBalance";

export default function PricingContent() {
  const { balance, loading: balanceLoading } = useBillingBalance();
  const [annual, setAnnual] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentPlanId = balance?.planId ?? "free";

  async function startCheckout(type: "subscription" | "topup", id: string) {
    setLoadingCheckout(`${type}:${id}`);
    setError(null);
    setNotice(null);

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

  async function handlePlanAction(planId: PlanId, action: ReturnType<typeof getPlanCardAction>) {
    setError(null);
    setNotice(null);

    if (action === "cancel") {
      await openPortal();
      return;
    }

    if (action === "upgrade") {
      // Upgrade is allowed while subscribed — pay via Checkout.
      await startCheckout("subscription", planId);
      return;
    }

    if (action === "subscribe") {
      // Re-fetch so we see cancel_at_period_end / cancel_at right after portal return.
      let cancelScheduled = Boolean(balance?.cancelAtPeriodEnd);
      let onPaidPlan = hasPurchasedPlan(currentPlanId);
      let hasStripeSubscription = balance?.hasStripeSubscription ?? false;

      try {
        const response = await fetch("/api/billing/balance");
        const data = await response.json();
        if (response.ok) {
          cancelScheduled = Boolean(data.cancelAtPeriodEnd);
          onPaidPlan = hasPurchasedPlan(String(data.planId ?? "free"));
          hasStripeSubscription = Boolean(data.hasStripeSubscription);
          notifyBillingBalanceRefresh();
        }
      } catch {
        // Fall back to in-memory balance values.
      }

      // Lower/other plans: allow checkout once the current plan is scheduled to cancel.
      // Checkout creates the new subscription and fulfill ends the old one immediately.
      if ((onPaidPlan || hasStripeSubscription) && !cancelScheduled) {
        setError(
          "Cancel your current subscription first before switching to another plan. After you schedule cancellation, you can subscribe to a lower plan right away. You can still upgrade without canceling.",
        );
        return;
      }

      await startCheckout("subscription", planId);
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
                {hasPurchasedPlan(balance.planId) &&
                  (balance.cancelAtPeriodEnd ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Cancels{" "}
                      {formatCancelDate(balance.currentPeriodEnd) ?? "soon"}
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Active
                    </span>
                  ))}
              </p>
            )}

            {balance?.cancelAtPeriodEnd && balance.currentPeriodEnd && (
              <p className="max-w-xl text-sm text-amber-800">
                Your {balance.planName} plan stays active until{" "}
                <span className="font-semibold">
                  {formatCancelDate(balance.currentPeriodEnd)}
                </span>
                . You can subscribe to another plan now — paying for it will
                switch you over and end {balance.planName} immediately. Or reopen
                billing to undo cancellation.
              </p>
            )}

            {balance && hasPurchasedPlan(balance.planId) && (
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={loadingCheckout === "portal"}
                className="btn btn-secondary disabled:opacity-50"
              >
                {loadingCheckout === "portal" ? "Opening…" : "Manage billing"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {notice && <div className="alert-success mb-6">{notice}</div>}
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
            const action = balanceLoading
              ? plan.id === "free"
                ? "free-info"
                : "subscribe"
              : getPlanCardAction(currentPlanId, plan.id);
            const isCurrentPlan = plan.id === currentPlanId;
            const loadingKey =
              action === "subscribe"
                ? `subscription:${plan.id}`
                : action === "upgrade"
                  ? `subscription:${plan.id}`
                  : action === "cancel"
                    ? "portal"
                    : null;
            const isLoading = loadingKey !== null && loadingCheckout === loadingKey;

            return (
              <div
                key={plan.id}
                className={`card-flat relative flex flex-col p-5 ${
                  isCurrentPlan
                    ? "ring-2 ring-emerald-300 bg-emerald-50/20"
                    : isPopular
                      ? "plan-popular bg-indigo-50/30 ring-2 ring-indigo-200"
                      : ""
                }`}
              >
                {isCurrentPlan && (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md ${
                      balance?.cancelAtPeriodEnd
                        ? "bg-amber-600"
                        : "bg-emerald-600"
                    }`}
                  >
                    {balance?.cancelAtPeriodEnd
                      ? `Cancels ${formatCancelDate(balance.currentPeriodEnd) ?? "soon"}`
                      : "Current plan"}
                  </span>
                )}
                {isPopular && !isCurrentPlan && (
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
                {action === "free-info" ? (
                  <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
                    {FREE_LIFETIME_TOKENS} tokens once at signup
                  </p>
                ) : action === "none" ? null : (
                  <>
                    {isCurrentPlan &&
                      balance?.cancelAtPeriodEnd &&
                      balance.currentPeriodEnd && (
                        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 ring-1 ring-amber-100">
                          Access until {formatCancelDate(balance.currentPeriodEnd)}.
                          Won&apos;t renew after that.
                        </p>
                      )}
                    <button
                    type="button"
                    onClick={() => void handlePlanAction(plan.id, action)}
                    disabled={Boolean(loadingCheckout)}
                    className={`btn w-full py-2.5 disabled:opacity-50 ${
                      isCurrentPlan && balance?.cancelAtPeriodEnd
                        ? "mt-2"
                        : "mt-4"
                    } ${
                      action === "upgrade"
                        ? "btn-primary"
                        : action === "cancel"
                          ? "btn-secondary"
                          : isPopular
                            ? "btn-primary"
                            : "btn-secondary"
                    }`}
                  >
                    {isLoading
                      ? action === "cancel"
                        ? "Opening…"
                        : action === "upgrade"
                          ? "Redirecting…"
                          : "Processing…"
                        : action === "upgrade"
                          ? "Upgrade"
                          : action === "cancel"
                            ? balance?.cancelAtPeriodEnd
                              ? "Manage cancellation"
                              : "Cancel subscription"
                            : balance?.cancelAtPeriodEnd &&
                                hasPurchasedPlan(currentPlanId)
                              ? "Switch & pay"
                              : "Subscribe"}
                  </button>
                  </>
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

function formatCancelDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
