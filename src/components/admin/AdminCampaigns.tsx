"use client";

import Link from "next/link";
import type { AdminCampaignSummary } from "@/lib/admin-types";

type AdminCampaignsProps = {
  initialCampaigns: AdminCampaignSummary[];
  initialTotal: number;
  initialPage: number;
};

export default function AdminCampaigns({
  initialCampaigns,
  initialTotal,
  initialPage,
}: AdminCampaignsProps) {
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(initialTotal / perPage));

  function buildUrl(page: number) {
    return page > 1 ? `/admin/campaigns?page=${page}` : "/admin/campaigns";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tables</h1>
        <p className="mt-1 text-sm text-slate-600">
          All saved lead tables across the platform.
        </p>
      </div>

      <div className="card-flat overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Contacts</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No tables found.
                  </td>
                </tr>
              ) : (
                initialCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{campaign.name}</div>
                      {campaign.aiQuery && (
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          AI: {campaign.aiQuery}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${campaign.userId}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {campaign.userEmail ?? campaign.userId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {campaign.contactCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{campaign.status}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(campaign.updatedAt).toLocaleDateString()}
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
            href={buildUrl(initialPage - 1)}
            aria-disabled={initialPage <= 1}
            className={`btn btn-secondary ${initialPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span className="text-sm text-slate-600">
            Page {initialPage} of {totalPages}
          </span>
          <Link
            href={buildUrl(initialPage + 1)}
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
