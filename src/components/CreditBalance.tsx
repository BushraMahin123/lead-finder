"use client";

import Link from "next/link";
import { useBillingBalance } from "@/hooks/useBillingBalance";

export default function CreditBalance() {
  const { balance, loading, refresh } = useBillingBalance();

  if (loading && !balance) {
    return <span className="text-sm text-slate-400">Tokens…</span>;
  }

  if (!balance) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/pricing"
        onClick={() => void refresh()}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
        title={`${balance.planName} plan`}
      >
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-200 text-[10px] text-amber-800">
          ◉
        </span>
        {balance.balance.toLocaleString()} tokens
      </Link>
    </div>
  );
}
