"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  AdminStripeContext,
  AdminStripeInvoice,
} from "@/lib/admin-billing";
import { fetchJson } from "@/lib/fetch-json";
import type { UserBillingSnapshot } from "@/lib/billing/tokens";

type PlanOption = {
  id: string;
  name: string;
  monthlyTokens: number;
  priceMonthly: number;
};

type UserDetail = {
  profile: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    companyName: string;
    jobTitle: string;
    companySize: string;
    industry: string;
    useCase: string;
    createdAt: string;
    isSuperAdmin: boolean;
  };
  billing: UserBillingSnapshot;
  stripe: AdminStripeContext;
  plans: PlanOption[];
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    contactCount: number;
    aiQuery: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  ledger: Array<{
    id: string;
    amount: number;
    balanceAfter: number;
    type: string;
    description: string | null;
    createdAt: string;
  }>;
};

export default function AdminUserDetail({
  userId,
  initialUser,
  initialPortalUrl,
}: {
  userId: string;
  initialUser: UserDetail;
  initialPortalUrl: string | null;
}) {
  const router = useRouter();
  const user = initialUser;
  const portalUrl = initialPortalUrl;

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [grantAmount, setGrantAmount] = useState("500");
  const [grantNote, setGrantNote] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState(user.billing.planId);
  const [grantMonthlyTokens, setGrantMonthlyTokens] = useState(false);
  const [syncStripe, setSyncStripe] = useState(true);
  const [planNote, setPlanNote] = useState("");
  const [compTokenAmount, setCompTokenAmount] = useState("");
  const [compNote, setCompNote] = useState("");

  async function runAction(
    key: string,
    action: () => Promise<void>,
  ): Promise<void> {
    setBusy(key);
    setNotice(null);
    setError(null);

    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleGrant(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    const amount = Number(grantAmount);
    if (!Number.isFinite(amount) || amount === 0) return;

    await runAction("grant", async () => {
      const { response, data } = await fetchJson(
        `/api/admin/users/${userId}/grant-tokens`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description: grantNote.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(String(data.error ?? "Failed to grant tokens"));
      }

      setNotice(String(data.message ?? "Tokens updated"));
      setGrantNote("");
    });
  }

  async function handleChangePlan(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    await runAction("change-plan", async () => {
      const { response, data } = await fetchJson(
        `/api/admin/users/${userId}/subscription/change-plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: selectedPlanId,
            grantMonthlyTokens,
            syncStripe,
            note: planNote.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(String(data.error ?? "Failed to change plan"));
      }

      setNotice(String(data.message ?? "Plan updated"));
      setPlanNote("");
    });
  }

  async function handleComp(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    const tokenAmount =
      compTokenAmount.trim() === "" ? undefined : Number(compTokenAmount);

    await runAction("comp", async () => {
      const { response, data } = await fetchJson(
        `/api/admin/users/${userId}/comp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: selectedPlanId,
            tokenAmount,
            syncStripe,
            note: compNote.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(String(data.error ?? "Failed to comp user"));
      }

      setNotice(String(data.message ?? "User comped"));
      setCompNote("");
      setCompTokenAmount("");
    });
  }

  async function handleCancel(immediate: boolean) {
    if (!userId) return;
    const label = immediate
      ? "Cancel this subscription immediately and move the user to free?"
      : "Schedule cancellation at the end of the billing period?";

    if (!window.confirm(label)) return;

    await runAction(immediate ? "cancel-now" : "cancel-later", async () => {
      const { response, data } = await fetchJson(
        `/api/admin/users/${userId}/subscription/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ immediate }),
        },
      );

      if (!response.ok) {
        throw new Error(String(data.error ?? "Failed to cancel subscription"));
      }

      setNotice(String(data.message ?? "Subscription updated"));
    });
  }

  async function handleSync() {
    if (!userId) return;

    await runAction("sync", async () => {
      const { response, data } = await fetchJson(
        `/api/admin/users/${userId}/subscription/sync`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error(String(data.error ?? "Failed to sync subscription"));
      }

      setNotice(String(data.message ?? "Subscription synced"));
    });
  }

  const { profile, billing, stripe, plans, campaigns, ledger } = user;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const hasStripeSubscription = Boolean(billing.stripeSubscriptionId);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/users"
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Back to users
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-flat p-6">
          <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <DetailRow label="Company" value={profile.companyName} />
            <DetailRow label="Role" value={profile.jobTitle} />
            <DetailRow label="Size" value={profile.companySize} />
            <DetailRow label="Industry" value={profile.industry} />
            <DetailRow label="Use case" value={profile.useCase} />
            <DetailRow
              label="Joined"
              value={new Date(profile.createdAt).toLocaleString()}
            />
          </dl>
        </section>

        <section className="card-flat p-6">
          <h2 className="text-lg font-semibold text-slate-900">Billing snapshot</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <DetailRow label="Plan" value={billing.planId} />
            <DetailRow
              label="Balance"
              value={`${billing.balance.toLocaleString()} tokens`}
            />
            <DetailRow
              label="Subscription"
              value={billing.subscriptionStatus ?? "—"}
            />
            <DetailRow
              label="Period end"
              value={
                billing.currentPeriodEnd
                  ? new Date(billing.currentPeriodEnd).toLocaleDateString()
                  : "—"
              }
            />
            <DetailRow
              label="Stripe customer"
              value={billing.stripeCustomerId ?? "—"}
            />
            <DetailRow
              label="Stripe subscription"
              value={billing.stripeSubscriptionId ?? "—"}
            />
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {stripe.dashboardCustomerUrl && (
              <a
                href={stripe.dashboardCustomerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Open in Stripe
              </a>
            )}
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Billing portal
              </a>
            )}
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={busy !== null}
              className="btn btn-secondary"
            >
              {busy === "sync" ? "Syncing…" : "Sync from Stripe"}
            </button>
          </div>
        </section>
      </div>

      <section className="card-flat p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Subscription management
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Change plans, comp users, or cancel Stripe subscriptions.
        </p>

        <form onSubmit={handleChangePlan} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Plan
              <select
                value={selectedPlanId}
                onChange={(event) => setSelectedPlanId(event.target.value)}
                className="input-field mt-1.5"
                disabled={busy !== null}
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                    {plan.monthlyTokens > 0
                      ? ` · ${plan.monthlyTokens.toLocaleString()} tokens/mo`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Note
              <input
                value={planNote}
                onChange={(event) => setPlanNote(event.target.value)}
                placeholder="Optional audit note"
                className="input-field mt-1.5"
                disabled={busy !== null}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={grantMonthlyTokens}
                onChange={(event) => setGrantMonthlyTokens(event.target.checked)}
                disabled={busy !== null}
              />
              Grant this plan&apos;s monthly tokens (
              {(selectedPlan?.monthlyTokens ?? 0).toLocaleString()})
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={syncStripe}
                onChange={(event) => setSyncStripe(event.target.checked)}
                disabled={busy !== null || !stripe.configured}
              />
              Sync change to Stripe
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy !== null}
              className="btn btn-primary"
            >
              {busy === "change-plan" ? "Updating plan…" : "Change plan"}
            </button>
            {hasStripeSubscription && (
              <>
                <button
                  type="button"
                  onClick={() => void handleCancel(false)}
                  disabled={busy !== null}
                  className="btn btn-secondary"
                >
                  Cancel at period end
                </button>
                <button
                  type="button"
                  onClick={() => void handleCancel(true)}
                  disabled={busy !== null}
                  className="btn btn-secondary text-red-600"
                >
                  Cancel immediately
                </button>
              </>
            )}
          </div>
        </form>

        <form
          onSubmit={handleComp}
          className="mt-8 border-t border-slate-100 pt-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Comp plan + tokens
          </h3>
          <p className="text-xs text-slate-500">
            Sets the selected plan and grants tokens in one action. Leave tokens
            blank to use the plan&apos;s monthly amount (
            {(selectedPlan?.monthlyTokens ?? 0).toLocaleString()}).
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              min={0}
              value={compTokenAmount}
              onChange={(event) => setCompTokenAmount(event.target.value)}
              placeholder={`Default ${(selectedPlan?.monthlyTokens ?? 0).toLocaleString()}`}
              className="input-field w-40"
              disabled={busy !== null}
            />
            <input
              value={compNote}
              onChange={(event) => setCompNote(event.target.value)}
              placeholder="Comp note (e.g. goodwill, pilot)"
              className="input-field min-w-[12rem] flex-1"
              disabled={busy !== null}
            />
            <button type="submit" disabled={busy !== null} className="btn btn-primary">
              {busy === "comp" ? "Comping…" : "Comp user"}
            </button>
          </div>
        </form>

        <form onSubmit={handleGrant} className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">Adjust tokens only</h3>
          <p className="mt-1 text-xs text-slate-500">
            Use a negative amount to remove tokens without changing the plan.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="number"
              value={grantAmount}
              onChange={(event) => setGrantAmount(event.target.value)}
              className="input-field w-32"
              disabled={busy !== null}
            />
            <input
              value={grantNote}
              onChange={(event) => setGrantNote(event.target.value)}
              placeholder="Optional note"
              className="input-field min-w-[12rem] flex-1"
              disabled={busy !== null}
            />
            <button type="submit" disabled={busy !== null} className="btn btn-primary">
              {busy === "grant" ? "Saving…" : "Apply"}
            </button>
          </div>
        </form>
      </section>

      {stripe.invoices.length > 0 && (
        <section className="card-flat overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Stripe invoices
            </h2>
          </div>
          <InvoiceTable invoices={stripe.invoices} />
        </section>
      )}

      <section className="card-flat overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Tables</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contacts</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No tables yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {campaign.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {campaign.contactCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{campaign.status}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(campaign.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-flat overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Token ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Balance after</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{entry.type}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      entry.amount >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {entry.balanceAfter.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {entry.description ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InvoiceTable({ invoices }: { invoices: AdminStripeInvoice[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Invoice</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td className="px-4 py-3 text-slate-600">
                {new Date(invoice.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {invoice.number ?? invoice.id}
              </td>
              <td className="px-4 py-3 text-slate-700">{invoice.status ?? "—"}</td>
              <td className="px-4 py-3 text-slate-700">
                {(invoice.amountPaid / 100).toLocaleString(undefined, {
                  style: "currency",
                  currency: invoice.currency.toUpperCase(),
                })}
              </td>
              <td className="px-4 py-3 text-right">
                {invoice.hostedInvoiceUrl && (
                  <a
                    href={invoice.hostedInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    View
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
