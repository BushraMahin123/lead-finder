"use client";

import Link from "next/link";
import { useBillingBalance } from "@/hooks/useBillingBalance";

export default function CreditBalance() {
  const { balance, loading, refresh } = useBillingBalance();

  if (loading && !balance) {
    return (
      <span className="inline-block h-8 w-24 animate-pulse rounded-full bg-slate-100" />
    );
  }

  if (!balance) {
    return null;
  }

  return (
    <Link
      href="/pricing"
      onClick={() => void refresh()}
      title={`${balance.planName} plan`}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">
        T
      </span>
      {balance.balance.toLocaleString()} tokens
    </Link>
  );
}
