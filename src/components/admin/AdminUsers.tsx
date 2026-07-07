"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminUserSummary } from "@/lib/admin-types";

type AdminUsersProps = {
  initialUsers: AdminUserSummary[];
  initialTotal: number;
  initialPage: number;
  initialQuery: string;
};

export default function AdminUsers({
  initialUsers,
  initialTotal,
  initialPage,
  initialQuery,
}: AdminUsersProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialQuery);

  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(initialTotal / perPage));

  function buildUrl(page: number, query: string) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    router.push(buildUrl(1, searchInput.trim()));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search accounts, view balances, and grant tokens.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by email, name, or company…"
          className="input-field min-w-[16rem] flex-1"
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <div className="card-flat overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Tables</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                initialUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {user.firstName} {user.lastName}
                        {user.isSuperAdmin && (
                          <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{user.companyName}</td>
                    <td className="px-4 py-3 text-slate-700">{user.planName}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.balance.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {user.campaignCount} · {user.contactCount} contacts
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${user.userId}`}
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
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
