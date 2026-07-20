"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminCreateAccountForm from "@/components/admin/AdminCreateAccountForm";
import { ApiError, fetchJson } from "@/lib/fetch-json";
import type { AdminWaitlistSignup } from "@/lib/admin-types";

type AdminWaitlistProps = {
  initialSignups: AdminWaitlistSignup[];
  initialTotal: number;
  initialPage: number;
  initialQuery: string;
};

function splitName(name: string | null): { firstName: string; lastName: string } {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export default function AdminWaitlist({
  initialSignups,
  initialTotal,
  initialPage,
  initialQuery,
}: AdminWaitlistProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(initialTotal / perPage));

  function buildUrl(page: number, query: string) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/admin/waitlist?${qs}` : "/admin/waitlist";
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    router.push(buildUrl(1, searchInput.trim()));
  }

  async function handleDelete(signup: AdminWaitlistSignup) {
    if (!window.confirm(`Remove ${signup.email} from the waitlist?`)) return;

    setBusyId(signup.id);
    setError(null);
    setNotice(null);

    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/admin/waitlist/${signup.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new ApiError(data.error || "Failed to delete", response.status);
      }
      setNotice(`Removed ${signup.email}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Waitlist
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Review signups and create accounts with emailed credentials.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by email, name, company, or role…"
          className="input-field min-w-[16rem] flex-1"
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="card-flat overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialSignups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No waitlist signups yet.
                  </td>
                </tr>
              ) : (
                initialSignups.map((signup) => {
                  const invited = Boolean(signup.invitedUserId || signup.invitedAt);
                  const names = splitName(signup.name);
                  const isOpen = invitingId === signup.id;

                  return (
                    <tr key={signup.id} className="align-top hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {signup.name || "—"}
                        </div>
                        <div className="text-xs text-slate-500">{signup.email}</div>
                        {isOpen && (
                          <div className="mt-3 max-w-md">
                            <AdminCreateAccountForm
                              waitlistSignupId={signup.id}
                              initialEmail={signup.email}
                              initialFirstName={names.firstName}
                              initialLastName={names.lastName}
                              initialCompanyName={signup.company ?? ""}
                              initialJobTitle={signup.role ?? ""}
                              submitLabel="Create account & email"
                              onCancel={() => setInvitingId(null)}
                              onSuccess={() => {
                                setNotice(`Invited ${signup.email}`);
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {signup.company || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {signup.role || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(signup.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {invited ? (
                          <div>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                              Invited
                            </span>
                            {signup.invitedUserId && (
                              <div className="mt-1">
                                <Link
                                  href={`/admin/users/${signup.invitedUserId}`}
                                  className="text-xs font-medium text-indigo-600 hover:underline"
                                >
                                  View user
                                </Link>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-2">
                          {!invited && !isOpen && (
                            <button
                              type="button"
                              className="text-sm font-medium text-indigo-600 hover:underline"
                              onClick={() => {
                                setInvitingId(signup.id);
                                setError(null);
                              }}
                            >
                              Create account
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-sm font-medium text-slate-500 hover:text-red-600 hover:underline"
                            disabled={busyId === signup.id}
                            onClick={() => handleDelete(signup)}
                          >
                            {busyId === signup.id ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Link
            href={buildUrl(initialPage - 1, initialQuery)}
            aria-disabled={initialPage <= 1}
            className={`btn btn-secondary ${initialPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span className="text-sm text-slate-600">
            Page {initialPage} of {totalPages}
          </span>
          <Link
            href={buildUrl(initialPage + 1, initialQuery)}
            aria-disabled={initialPage >= totalPages}
            className={`btn btn-secondary ${initialPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
