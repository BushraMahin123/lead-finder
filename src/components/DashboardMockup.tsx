import { AISearchIconBadge } from "@/components/AISearchIcon";

export default function DashboardMockup() {
  return (
    <div className="card-elevated relative overflow-hidden">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-violet-400/15 blur-3xl" />

      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs font-medium text-slate-500">
            LEADMAGPRO — Search workspace
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[11rem_1fr]">
        <aside className="hidden border-r border-slate-100 bg-slate-50/50 p-3 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Filters
          </p>
          <div className="mt-3 space-y-2">
            {["Job title", "Location", "Industry", "Seniority"].map((item, i) => (
              <div
                key={item}
                className={`rounded-lg px-2 py-1.5 text-xs ${
                  i === 0
                    ? "bg-indigo-100 font-medium text-indigo-800 ring-1 ring-indigo-200"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="p-4 sm:p-5">
          <div className="ai-search-bar px-4 py-3">
            <div className="flex items-start gap-3">
              <AISearchIconBadge size="sm" className="mt-0.5" />
              <div>
                <p className="text-xs font-medium text-indigo-600">AI-assisted search</p>
                <p className="mt-0.5 text-sm text-slate-700">
                  VP Sales at SaaS companies in the US, 51–200 employees
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Contact</th>
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  ["Sarah Chen", "VP Sales", "Cloudbase", "98%"],
                  ["Marcus Reid", "Head of Sales", "Dataflow", "95%"],
                  ["Elena Rossi", "Sales Director", "Stackline", "92%"],
                ].map(([name, title, company, match]) => (
                  <tr key={name}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                          {name.charAt(0)}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{name}</p>
                          <p className="text-slate-500">{title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{company}</td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      <span className="badge-success">{match}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
