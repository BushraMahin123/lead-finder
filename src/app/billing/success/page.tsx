import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default function BillingSuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AppHeader />
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Payment successful</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your tokens will appear in your balance shortly. If you subscribed, monthly
          tokens renew each billing cycle.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to tables
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            View pricing
          </Link>
        </div>
      </div>
    </main>
  );
}
