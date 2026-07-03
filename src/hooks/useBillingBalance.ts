"use client";

import { useCallback, useEffect, useState } from "react";

export interface BillingBalance {
  balance: number;
  planId: string;
  planName: string;
  freeTokensGranted: boolean;
  subscriptionStatus: string | null;
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
        throw new Error(String(data.error ?? "Failed to load token balance"));
      }

      setBalance({
        balance: Number(data.balance ?? 0),
        planId: String(data.planId ?? "free"),
        planName: String(data.planName ?? "Free"),
        freeTokensGranted: Boolean(data.freeTokensGranted),
        subscriptionStatus: data.subscriptionStatus ?? null,
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

  return { balance, loading, error, refresh };
}
