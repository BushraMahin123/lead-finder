"use client";

import { useCallback, useEffect, useState } from "react";

export interface BillingBalance {
  balance: number;
  planId: string;
  planName: string;
  freeTokensGranted: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeSubscription: boolean;
}

const BILLING_BALANCE_REFRESH_EVENT = "billing-balance-refresh";

/** Notify every mounted balance widget (header + pricing) to reload. */
export function notifyBillingBalanceRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BILLING_BALANCE_REFRESH_EVENT));
}

export function useBillingBalance() {
  const [balance, setBalance] = useState<BillingBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/balance");
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setBalance(null);
          return;
        }

        throw new Error(String(data.error ?? "Failed to load token balance"));
      }

      setBalance({
        balance: Number(data.balance ?? 0),
        planId: String(data.planId ?? "free"),
        planName: String(data.planName ?? "Free"),
        freeTokensGranted: Boolean(data.freeTokensGranted),
        subscriptionStatus: data.subscriptionStatus ?? null,
        currentPeriodEnd:
          typeof data.currentPeriodEnd === "string"
            ? data.currentPeriodEnd
            : null,
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
        hasStripeSubscription: Boolean(data.hasStripeSubscription),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load balance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => {
      void refresh();
    };
    window.addEventListener(BILLING_BALANCE_REFRESH_EVENT, onRefresh);
    return () => {
      window.removeEventListener(BILLING_BALANCE_REFRESH_EVENT, onRefresh);
    };
  }, [refresh]);

  return { balance, loading, error, refresh };
}
