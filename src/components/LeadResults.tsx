"use client";

import type { LeadPerson } from "@/types/lead";

interface LeadResultsProps {
  people: LeadPerson[];
  totalEntries: number;
  loading: boolean;
}

function displayName(person: LeadPerson): string {
  if (person.name) return person.name;
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || "—";
}

function displayPhone(person: LeadPerson): string {
  const phones = person.phone_numbers ?? [];
  if (phones.length === 0) return "—";
  return phones
    .map((phone) => phone.sanitized_number || phone.raw_number)
    .filter(Boolean)
    .join(", ");
}

function displayLocation(person: LeadPerson): string {
  const parts = [person.city, person.state, person.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  const org = person.organization;
  if (!org) return "—";
  return [org.city, org.state, org.country].filter(Boolean).join(", ") || "—";
}

export default function LeadResults({
  people,
  totalEntries,
  loading,
}: LeadResultsProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        Fetching leads from Apollo...
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
        No leads yet. Run a search to see results here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Results</h2>
        <p className="text-sm text-slate-500">
          Showing {people.length} of {totalEntries.toLocaleString()} matches
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">LinkedIn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((person) => (
              <tr key={person.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {displayName(person)}
                </td>
                <td className="px-4 py-3 text-slate-700">{person.title ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">
                  <div>{person.organization?.name ?? "—"}</div>
                  {person.organization?.primary_domain && (
                    <div className="text-xs text-slate-500">
                      {person.organization.primary_domain}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {person.email ? (
                    <a
                      href={`mailto:${person.email}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {person.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{displayPhone(person)}</td>
                <td className="px-4 py-3 text-slate-700">{displayLocation(person)}</td>
                <td className="px-4 py-3">
                  {person.linkedin_url ? (
                    <a
                      href={person.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Profile
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
