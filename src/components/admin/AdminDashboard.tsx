"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminLedgerEntry, AdminStats } from "@/lib/admin-data";

function formatAmount(amount: number): string {
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${amount.toLocaleString()}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentLedger, setRecentLedger] = useState<AdminLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/stats");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(String(data.error ?? "Failed to load stats"));
        }
        setStats(data.stats as AdminStats);
        setRecentLedger((data.recentLedger ?? []) as AdminLedgerEntry[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading admin overview…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Users", value: stats.totalUsers.toLocaleString() },
    { label: "Tables", value: stats.totalCampaigns.toLocaleString() },
    { label: "Saved contacts", value: stats.totalContacts.toLocaleString() },
    {
      label: "Total token balance",
      value: stats.totalTokenBalance.toLocaleString(),
    },
    {
      label: "Tokens credited today",
      value: stats.tokensCreditedToday.toLocaleString(),
    },
    {
      label: "Tokens used today",
      value: stats.tokensDebitedToday.toLocaleString(),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Admin overview
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Platform-wide metrics and recent token activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card-flat p-5">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="card-flat overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent token activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Balance after</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No ledger entries yet.
                  </td>
                </tr>
              ) : (
                recentLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${entry.userId}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {entry.userEmail ?? entry.userId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{entry.type}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        entry.amount >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {formatAmount(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {entry.balanceAfter.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {entry.description ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
