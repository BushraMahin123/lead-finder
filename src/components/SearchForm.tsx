"use client";

import type { SearchFilters } from "@/types/lead";

interface SearchFormProps {
  loading: boolean;
  onSearch: (filters: SearchFilters) => void;
}

const SENIORITY_OPTIONS = [
  { value: "", label: "Any seniority" },
  { value: "owner", label: "Owner" },
  { value: "founder", label: "Founder" },
  { value: "c_suite", label: "C-Suite" },
  { value: "vp", label: "VP" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
];

export default function SearchForm({ loading, onSearch }: SearchFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onSearch({
      keywords: String(form.get("keywords") ?? ""),
      jobTitle: String(form.get("jobTitle") ?? ""),
      location: String(form.get("location") ?? ""),
      companyDomain: String(form.get("companyDomain") ?? ""),
      industry: String(form.get("industry") ?? ""),
      seniority: String(form.get("seniority") ?? ""),
      enrichContacts: form.get("enrichContacts") === "on",
      perPage: Number(form.get("perPage") ?? 25),
      page: 1,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Keywords</span>
          <input
            name="keywords"
            placeholder="e.g. SaaS, marketing agency, dental clinic"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Job title</span>
          <input
            name="jobTitle"
            placeholder="e.g. CEO, Marketing Director"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Location</span>
          <input
            name="location"
            placeholder="e.g. California, US or London, UK"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Company domain</span>
          <input
            name="companyDomain"
            placeholder="e.g. stripe.com, shopify.com"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Industry</span>
          <input
            name="industry"
            placeholder="e.g. software, healthcare"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Seniority</span>
          <select
            name="seniority"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            {SENIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="enrichContacts"
            defaultChecked
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          Reveal emails &amp; phone numbers (uses Apollo credits)
        </label>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Results
            <select
              name="perPage"
              defaultValue="25"
              className="rounded-lg border border-slate-300 px-2 py-1.5"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Searching..." : "Find leads"}
          </button>
        </div>
      </div>
    </form>
  );
}
