"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { notifyBillingBalanceRefresh } from "@/hooks/useBillingBalance";
import { fetchJson } from "@/lib/fetch-json";

export default function BillingSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"pending" | "done" | "error">(
    sessionId ? "pending" : "done",
  );
  const [message, setMessage] = useState(
    sessionId
      ? "Confirming your payment and updating your plan…"
      : "Your tokens will appear in your balance shortly.",
  );
  const [checkoutType, setCheckoutType] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function confirm() {
      try {
        const { response, data } = await fetchJson<{
          error?: string;
          message?: string;
          checkoutType?: string;
        }>("/api/billing/confirm-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(String(data.error ?? "Could not confirm payment"));
        }

        const type =
          typeof data.checkoutType === "string" ? data.checkoutType : null;
        setCheckoutType(type);
        setStatus("done");
        setMessage(
          typeof data.message === "string"
            ? data.message
            : "Payment confirmed. Your plan and tokens are updated.",
        );
        notifyBillingBalanceRefresh();

        if (type === "calling") {
          window.setTimeout(() => {
            if (!cancelled) {
              router.push("/settings/phone-numbers");
            }
          }, 1200);
        }
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Payment succeeded in Stripe, but we could not update your account yet. Refresh pricing in a moment, or contact support.",
        );
      }
    }

    void confirm();

    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
          status === "error"
            ? "bg-amber-100 text-amber-700"
            : status === "pending"
              ? "bg-slate-100 text-slate-500"
              : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {status === "pending" ? "…" : status === "error" ? "!" : "✓"}
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">
        {status === "pending"
          ? "Finishing setup"
          : status === "error"
            ? "Payment received"
            : "Payment successful"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      {checkoutType === "calling" && status === "done" ? (
        <p className="mt-2 text-sm text-emerald-700">
          Next: claim your included phone number…
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {checkoutType === "calling" ? (
          <Link
            href="/settings/phone-numbers"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Get your number
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to tables
          </Link>
        )}
        <Link
          href="/pricing"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          View pricing
        </Link>
      </div>
    </div>
  );
}
