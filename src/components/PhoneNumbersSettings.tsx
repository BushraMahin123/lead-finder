"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchJson } from "@/lib/fetch-json";
import type { AvailablePhoneNumber, UserPhoneNumber } from "@/types/phone-numbers";

export default function PhoneNumbersSettings() {
  const [owned, setOwned] = useState<UserPhoneNumber[]>([]);
  const [results, setResults] = useState<AvailablePhoneNumber[]>([]);
  const [country, setCountry] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [locality, setLocality] = useState("");
  const [loadingOwned, setLoadingOwned] = useState(true);
  const [searching, setSearching] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadOwned = useCallback(async () => {
    setLoadingOwned(true);
    setError(null);
    try {
      const { response, data } = await fetchJson<{
        numbers?: UserPhoneNumber[];
        error?: string;
      }>("/api/dialer/numbers");
      if (!response.ok) {
        throw new ApiError(data.error ?? "Failed to load numbers", response.status);
      }
      setOwned(data.numbers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load numbers");
    } finally {
      setLoadingOwned(false);
    }
  }, []);

  useEffect(() => {
    void loadOwned();
  }, [loadOwned]);

  async function searchNumbers(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setNotice(null);
    setResults([]);
    try {
      const params = new URLSearchParams({
        mode: "search",
        country,
      });
      if (areaCode.trim()) params.set("areaCode", areaCode.trim());
      if (locality.trim()) params.set("locality", locality.trim());

      const { response, data } = await fetchJson<{
        numbers?: AvailablePhoneNumber[];
        error?: string;
      }>(`/api/dialer/numbers?${params.toString()}`);

      if (!response.ok) {
        throw new ApiError(data.error ?? "Search failed", response.status);
      }

      setResults(data.numbers ?? []);
      if ((data.numbers ?? []).length === 0) {
        setNotice("No numbers found. Try another area code or city.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function buyNumber(item: AvailablePhoneNumber) {
    setBuyingNumber(item.phoneNumber);
    setError(null);
    setNotice(null);
    try {
      const monthly = item.costInformation?.monthly_cost
        ? Number(item.costInformation.monthly_cost)
        : null;
      const upfront = item.costInformation?.upfront_cost
        ? Number(item.costInformation.upfront_cost)
        : null;

      const { response, data } = await fetchJson<{
        number?: UserPhoneNumber;
        error?: string;
      }>("/api/dialer/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: item.phoneNumber,
          countryCode: country,
          monthlyCost: Number.isFinite(monthly) ? monthly : null,
          upfrontCost: Number.isFinite(upfront) ? upfront : null,
        }),
      });

      if (!response.ok || !data.number) {
        throw new ApiError(data.error ?? "Purchase failed", response.status);
      }

      setNotice(`Number ${data.number.phoneNumber} is ready to use as your caller ID.`);
      setResults([]);
      await loadOwned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBuyingNumber(null);
    }
  }

  const hasActive = owned.some((n) => n.status === "active");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="section-label">Dialer</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        Phone numbers
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Get a calling number inside LEADMAGPRO. You don’t need to buy numbers in
        the Telnyx portal — we’ll provision one on your account connection.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Your numbers</h2>
        {loadingOwned ? (
          <p className="mt-3 text-sm text-slate-500">Loading…</p>
        ) : owned.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No number yet. Search below and purchase one.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {owned.map((number) => (
              <li
                key={number.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-slate-900">
                    {number.phoneNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {number.countryCode} · {number.status}
                    {number.isDefault ? " · default caller ID" : ""}
                  </p>
                </div>
                {number.isDefault ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Active
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!hasActive ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Buy a number</h2>
          <form onSubmit={(e) => void searchNumbers(e)} className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-slate-600">
              Country
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Area code (3 digits)
              <input
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                placeholder="307"
                inputMode="numeric"
                maxLength={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              City
              <input
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="Sheridan"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
              />
            </label>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={searching}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {searching ? "Searching…" : "Search numbers"}
              </button>
            </div>
          </form>

          {results.length > 0 ? (
            <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
              {results.map((item) => (
                <li
                  key={item.phoneNumber}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <p className="font-mono text-sm font-medium text-slate-900">
                    {item.phoneNumber}
                  </p>
                  <button
                    type="button"
                    disabled={buyingNumber === item.phoneNumber}
                    onClick={() => void buyNumber(item)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {buyingNumber === item.phoneNumber ? "Buying…" : "Get number"}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          You already have an active number. Softphone calls will use it as caller ID.
        </p>
      )}
    </div>
  );
}
