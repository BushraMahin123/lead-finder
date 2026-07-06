"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AISearchIconBadge } from "@/components/AISearchIcon";
import {
  IconArrowRight,
  IconChevronRight,
  IconClock,
  IconCoins,
  IconPlus,
  IconSearch,
  IconTable,
  IconUsers,
} from "@/components/icons";
import { useBillingBalance } from "@/hooks/useBillingBalance";
import { SEARCH_TEMPLATES } from "@/lib/search-templates";
import { displayNameFromEmail } from "@/lib/user-display";
import type { Campaign } from "@/types/campaign";
import type { SearchFilters } from "@/types/lead";

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getFilterPills(filters: SearchFilters): string[] {
  const pills: string[] = [];

  if (filters.jobTitle?.trim()) pills.push(filters.jobTitle.trim());
  for (const location of filters.locations ?? []) {
    if (pills.length >= 4) break;
    pills.push(location);
  }
  for (const industry of filters.industries ?? []) {
    if (pills.length >= 4) break;
    pills.push(industry);
  }
  for (const size of filters.employeeSizes ?? []) {
    if (pills.length >= 4) break;
    pills.push(`${size} employees`);
  }
  if (filters.keywords?.trim() && pills.length < 4) {
    pills.push(filters.keywords.trim());
  }

  return pills.slice(0, 4);
}

function campaignSubtitle(campaign: Campaign): string | null {
  const query = campaign.aiQuery?.trim();
  if (!query) return null;
  if (query.toLowerCase() === campaign.name.trim().toLowerCase()) return null;
  return query.length > 72 ? `${query.slice(0, 69)}…` : query;
}

interface DashboardContentProps {
  userEmail: string | null;
}

export default function DashboardContent({ userEmail }: DashboardContentProps) {
  const { balance } = useBillingBalance();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/campaigns");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(String(data.error ?? "Failed to load tables"));
        }
        setCampaigns((data.campaigns as Campaign[] | undefined) ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tables");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = campaigns.filter((campaign) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      campaign.name.toLowerCase().includes(query) ||
      (campaign.aiQuery?.toLowerCase().includes(query) ?? false)
    );
  });

  const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.contactCount, 0);
  const firstName = displayNameFromEmail(userEmail);
  const tokenBalance = balance?.balance ?? 0;
  const tokensLow = balance ? tokenBalance < 50 : false;
  const tokensCritical = balance ? tokenBalance < 10 : false;
  const isEmpty = !loading && campaigns.length === 0;
  const noSearchResults = !loading && campaigns.length > 0 && filtered.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/60 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">Tables</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Your saved lead lists live here. Open a table to enrich contacts,
              export, or continue outreach.
            </p>
          </div>

          <Link
            href="/?view=search"
            className="btn btn-primary shrink-0 self-start px-5 py-2.5 shadow-md shadow-indigo-200/50 lg:self-auto"
          >
            <IconPlus className="h-4 w-4" />
            New search
          </Link>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Token balance"
            value={balance ? tokenBalance.toLocaleString() : "—"}
            hint={balance ? balance.planName : undefined}
            warning={tokensLow}
            critical={tokensCritical}
            href="/pricing"
            icon={<IconCoins className="h-5 w-5" />}
          />
          <MetricCard
            label="Saved leads"
            value={loading ? "—" : totalLeads.toLocaleString()}
            hint="Across all tables"
            icon={<IconUsers className="h-5 w-5" />}
          />
          <MetricCard
            label="Active tables"
            value={loading ? "—" : String(campaigns.length)}
            hint={campaigns.length === 1 ? "1 list" : `${campaigns.length} lists`}
            icon={<IconTable className="h-5 w-5" />}
          />
          <MetricCard
            label="Latest activity"
            value={
              loading || campaigns.length === 0
                ? "—"
                : formatRelativeDate(campaigns[0].updatedAt)
            }
            hint={
              campaigns[0]
                ? campaigns[0].name.length > 28
                  ? `${campaigns[0].name.slice(0, 25)}…`
                  : campaigns[0].name
                : "No tables yet"
            }
            icon={<IconClock className="h-5 w-5" />}
          />
        </div>
      </section>

      {tokensCritical && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">
            You&apos;re running low on tokens ({tokenBalance} left). Searches and
            enrichments will pause when you hit zero.
          </p>
          <Link href="/pricing" className="btn btn-secondary shrink-0 bg-white text-sm">
            Get more tokens
          </Link>
        </div>
      )}

      <div className={`mt-8 grid gap-8 ${!isEmpty ? "lg:grid-cols-[minmax(0,1fr)_17rem]" : ""}`}>
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your tables</h2>
              {!isEmpty && (
                <p className="mt-0.5 text-sm text-slate-500">
                  {filtered.length} of {campaigns.length} table
                  {campaigns.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
            {!isEmpty && (
              <TableSearchField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name or query"
              />
            )}
          </div>

          {error && <div className="alert-error mb-4">{error}</div>}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : isEmpty ? (
            <EmptyTablesState />
          ) : noSearchResults ? (
            <div className="card-flat border-dashed px-6 py-12 text-center">
              <p className="text-sm text-slate-600">No tables match your search.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((campaign) => (
                <TableCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </section>

        {!isEmpty && !loading && (
          <aside className="space-y-4">
            <div className="card-flat p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Quick actions
              </p>
              <div className="mt-4 space-y-2">
                <Link
                  href="/?view=search"
                  className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm font-medium text-indigo-800 transition hover:bg-indigo-100"
                >
                  <AISearchIconBadge size="sm" />
                  Run AI search
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <IconCoins className="h-4 w-4" />
                  </span>
                  {tokensLow ? "Top up tokens" : "View plans"}
                </Link>
              </div>
            </div>

            <div className="card-flat p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Start from template
              </p>
              <div className="mt-3 space-y-2">
                {SEARCH_TEMPLATES.map((template) => (
                  <Link
                    key={template.id}
                    href={`/?view=search&q=${encodeURIComponent(template.query)}`}
                    className="block rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-indigo-200 hover:shadow-sm"
                  >
                    <p className="text-sm font-medium text-slate-900">{template.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                      {template.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function TableSearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="w-full sm:w-72">
      <span className="sr-only">{placeholder}</span>
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3 py-0 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
        <IconSearch className="h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
    </label>
  );
}

function MetricCard({
  label,
  value,
  hint,
  warning = false,
  critical = false,
  href,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  warning?: boolean;
  critical?: boolean;
  href?: string;
  icon?: ReactNode;
}) {
  const tone = critical
    ? "border-amber-200 bg-amber-50"
    : warning
      ? "border-amber-100 bg-amber-50/70"
      : "border-slate-200 bg-slate-50/80";

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {icon && (
          <span className={critical ? "text-amber-700" : "text-slate-400"}>
            {icon}
          </span>
        )}
      </div>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${
          critical ? "text-amber-900" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`rounded-xl border px-4 py-4 transition hover:shadow-sm ${tone}`}
      >
        {content}
      </Link>
    );
  }

  return <div className={`rounded-xl border px-4 py-4 ${tone}`}>{content}</div>;
}

function TableCard({ campaign }: { campaign: Campaign }) {
  const pills = getFilterPills(campaign.searchFilters);
  const subtitle = campaignSubtitle(campaign);

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group card-flat flex h-full flex-col p-5 transition hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition group-hover:bg-indigo-100">
            <IconTable className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
              {campaign.name}
            </h3>
            {subtitle && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <IconChevronRight className="text-slate-300 transition group-hover:text-indigo-500" />
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-slate-900">
          {campaign.contactCount.toLocaleString()}
        </span>
        <span className="text-sm text-slate-500">contacts</span>
      </div>

      {pills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pills.map((pill) => (
            <span
              key={pill}
              className="inline-flex max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600"
            >
              {pill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>Updated {formatRelativeDate(campaign.updatedAt)}</span>
        {campaign.enrichEmail && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-100">
            Email
          </span>
        )}
        {campaign.enrichPhone && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-100">
            Phone
          </span>
        )}
      </div>
    </Link>
  );
}

function EmptyTablesState() {
  return (
    <div className="card overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col justify-center border-b border-slate-100 p-8 lg:border-b-0 lg:border-r">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <IconTable className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No tables yet</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Search for leads, then save your best matches to a table you can
            enrich and export.
          </p>
          <Link href="/?view=search" className="btn btn-primary mt-5 w-fit px-5 py-2.5">
            Start your first search
          </Link>
        </div>

        <div className="bg-slate-50/60 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Quick-start templates
          </p>
          <div className="mt-4 space-y-2">
            {SEARCH_TEMPLATES.map((template) => (
              <Link
                key={template.id}
                href={`/?view=search&q=${encodeURIComponent(template.query)}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-200 hover:shadow-sm"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium text-slate-900">{template.label}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {template.description}
                  </p>
                </div>
                <IconArrowRight className="text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
