"use client";

interface LandingHeroProps {
  onStart: () => void;
}

export default function LandingHero({ onStart }: LandingHeroProps) {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col items-center justify-center gap-10 overflow-hidden px-4 py-8 sm:px-6 lg:flex-row lg:gap-16 lg:px-8">
      <div className="max-w-xl space-y-6 text-center lg:text-left">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          B2B Lead Finder
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Find the right people at the right companies
        </h1>
        <p className="text-lg leading-relaxed text-slate-600">
          Search millions of professional profiles. Filter by job title,
          location, seniority, department, industry, company size, and more —
          then reveal emails and phone numbers for your top matches.
        </p>
        <ul className="space-y-2 text-left text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-700">
              ✓
            </span>
            Checkbox filters for location, seniority, and department
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-700">
              ✓
            </span>
            Company domain, industry, and headcount targeting
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-700">
              ✓
            </span>
            Export-ready contact details for outreach
          </li>
        </ul>
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
        >
          Start searching
        </button>
      </div>

      <div className="relative w-full max-w-md shrink-0">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-100 via-violet-50 to-sky-100 blur-2xl" />
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <svg
            viewBox="0 0 400 320"
            className="h-auto w-full"
            aria-hidden
          >
            <rect width="400" height="320" fill="#f8fafc" rx="16" />
            <circle cx="200" cy="120" r="48" fill="#4f46e5" opacity="0.15" />
            <circle cx="200" cy="120" r="32" fill="#4f46e5" />
            <text
              x="200"
              y="128"
              textAnchor="middle"
              fill="white"
              fontSize="20"
              fontWeight="600"
            >
              CEO
            </text>
            <line x1="200" y1="152" x2="100" y2="220" stroke="#c7d2fe" strokeWidth="2" />
            <line x1="200" y1="152" x2="200" y2="230" stroke="#c7d2fe" strokeWidth="2" />
            <line x1="200" y1="152" x2="300" y2="220" stroke="#c7d2fe" strokeWidth="2" />
            <rect x="52" y="220" width="96" height="56" rx="12" fill="#eef2ff" stroke="#c7d2fe" />
            <text x="100" y="252" textAnchor="middle" fill="#4338ca" fontSize="12" fontWeight="600">
              VP Sales
            </text>
            <rect x="152" y="230" width="96" height="56" rx="12" fill="#eef2ff" stroke="#c7d2fe" />
            <text x="200" y="262" textAnchor="middle" fill="#4338ca" fontSize="12" fontWeight="600">
              Marketing
            </text>
            <rect x="252" y="220" width="96" height="56" rx="12" fill="#eef2ff" stroke="#c7d2fe" />
            <text x="300" y="252" textAnchor="middle" fill="#4338ca" fontSize="12" fontWeight="600">
              Engineering
            </text>
            <rect x="24" y="24" width="140" height="36" rx="8" fill="white" stroke="#e2e8f0" />
            <text x="40" y="47" fill="#64748b" fontSize="11">
              📍 United States
            </text>
            <rect x="236" y="24" width="140" height="36" rx="8" fill="white" stroke="#e2e8f0" />
            <text x="252" y="47" fill="#64748b" fontSize="11">
              🏢 SaaS · 51–200
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
