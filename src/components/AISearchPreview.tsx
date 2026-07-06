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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 ring-2 ring-white">
      {initial}
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#0A66C2]" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function AISearchPreview({
  people,
  totalEntries,
  loading = false,
  isAiSearch = false,
  onSave,
}: AISearchPreviewProps) {
  const previewPeople = people.slice(0, 8);
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {totalEntries.toLocaleString()} matches found
          </p>
          <p className="text-xs text-slate-500">Showing preview of top results</p>
        </div>
        {isAiSearch && (
          <span className="badge">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden>
              <path d="M8 1l1 3h3l-2.5 2 1 3L8 7l-2.5 2 1-3L4 4h3L8 1z" />
            </svg>
            AI Search
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 sm:px-6">
        <div className="card overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/90 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Contact</th>
                <th className="px-4 py-2.5 font-semibold">Company</th>
                <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Title</th>
                <th className="px-4 py-2.5 font-semibold">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewPeople.map((person) => {
                const name = displayName(person);
                const company = person.organization?.name ?? "—";

                return (
                  <tr key={person.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <PersonAvatar name={name} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium text-slate-900">{name}</p>
                            {person.linkedin_url && <LinkedInIcon />}
                          </div>
                          <p className="truncate text-xs text-slate-500 md:hidden">
                            {person.title ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate font-medium text-slate-800">{company}</p>
                      {person.organization?.primary_domain && (
                        <p className="truncate text-xs text-slate-500">
                          {person.organization.primary_domain}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-700 md:table-cell">
                      {person.title ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {person.seniority && (
                          <span className="pill pill-indigo">{person.seniority}</span>
                        )}
                        {person.organization?.industry && (
                          <span className="pill pill-slate">{person.organization.industry}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {previewPeople.slice(0, 4).map((person) => (
                <PersonAvatar key={person.id} name={displayName(person)} />
              ))}
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{formatTotal}</span> contacts ready to save
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={loading || totalEntries === 0}
            className="btn btn-primary w-full px-8 py-3 sm:w-auto"
          >
            Save contacts
          </button>
        </div>
      </div>
    </div>
  );
}
