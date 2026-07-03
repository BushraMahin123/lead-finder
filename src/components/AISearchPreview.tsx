"use client";

import type { LeadPerson } from "@/types/lead";

interface AISearchPreviewProps {
  people: LeadPerson[];
  totalEntries: number;
  loading?: boolean;
  isAiSearch?: boolean;
  onSave: () => void;
}

function displayName(person: LeadPerson): string {
  if (person.name) return person.name;
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || "Unknown";
}

function PersonAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
      {initial}
    </div>
  );
}

function CompanyAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "C";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
      {initial}
    </div>
  );
}

export default function AISearchPreview({
  people,
  totalEntries,
  loading = false,
  isAiSearch = false,
  onSave,
}: AISearchPreviewProps) {
  const previewPeople = people.slice(0, 5);
  const formatTotal =
    totalEntries >= 1000
      ? `${Math.floor(totalEntries / 1000)}K+`
      : totalEntries.toLocaleString();

  if (loading && previewPeople.length === 0) {
    return (
      <div className="flex h-full flex-1 items-center justify-center px-6 py-12 text-sm text-slate-500">
        Fetching sample contacts…
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {isAiSearch && (
        <div className="flex items-center justify-end px-6 pt-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span aria-hidden>✨</span>
            AI Search
          </span>
        </div>
      )}

      <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewPeople.map((person) => {
                  const name = displayName(person);
                  const company = person.organization?.name ?? "—";

                  return (
                    <tr key={person.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={name} />
                          <div>
                            <p className="font-medium text-slate-900">{name}</p>
                            {person.linkedin_url && (
                              <p className="text-xs text-slate-500">LinkedIn profile</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CompanyAvatar name={company} />
                          <div>
                            <p className="font-medium text-slate-900">{company}</p>
                            {person.organization?.primary_domain && (
                              <p className="text-xs text-slate-500">
                                {person.organization.primary_domain}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{person.title ?? "—"}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {[person.seniority, person.organization?.industry]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center text-center">
          <div className="mb-4 flex items-center">
            {previewPeople.slice(0, 4).map((person, index) => (
              <div
                key={person.id}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-xs font-semibold text-indigo-700 ${
                  index > 0 ? "-ml-2" : ""
                }`}
              >
                {displayName(person).charAt(0)}
              </div>
            ))}
            {totalEntries > 4 && (
              <div className="-ml-2 flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 px-2 text-xs font-semibold text-white">
                +{formatTotal}
              </div>
            )}
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            We&apos;ve found {totalEntries.toLocaleString()} contacts
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Refine your sample contacts before saving to your account
          </p>

          <button
            type="button"
            onClick={onSave}
            disabled={loading || totalEntries === 0}
            className="mt-8 w-full max-w-md rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:from-slate-800 hover:to-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save contacts
          </button>
        </div>
      </div>
    </div>
  );
}
