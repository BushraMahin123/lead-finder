"use client";

import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

const TESTIMONIALS = [
  {
    quote:
      "We cut list-building from 3 hours to 20 minutes. The AI filters nail our ICP on the first try.",
    name: "Jordan Ellis",
    role: "Head of Growth",
    company: "Northwind SaaS",
    initials: "JE",
  },
  {
    quote:
      "Finally a prospecting tool where the data feels actionable — not just a CSV dump of stale contacts.",
    name: "Priya Sharma",
    role: "VP Sales",
    company: "Globex Systems",
    initials: "PS",
  },
  {
    quote:
      "Our SDRs went from 40 to 120 qualified conversations per month after switching workflows.",
    name: "Alex Morgan",
    role: "Revenue Operations",
    company: "Acme Analytics",
    initials: "AM",
  },
] as const;

const VALUE_PROPS = [
  "AI builds your filters from plain English",
  "Enrich emails and phones in one click",
  "Organize leads into searchable tables",
] as const;

export default function AuthBrandPanel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % TESTIMONIALS.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const testimonial = TESTIMONIALS[index];

  return (
    <div className="auth-panel relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-[#0c1222] to-indigo-950 lg:flex lg:max-h-screen lg:min-h-screen lg:flex-col lg:justify-between lg:p-8 xl:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <div className="relative">
        <BrandLogo href="/" inverted />
      </div>

      <div className="relative max-w-lg space-y-6">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
            B2B prospecting
          </p>
          <h2 className="!text-white text-[1.75rem] font-semibold leading-[1.2] tracking-tight xl:text-[2rem]">
            From ICP criteria to contact lists, faster.
          </h2>
          <ul className="space-y-2">
            {VALUE_PROPS.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-slate-200">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/40">
                  <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5" aria-hidden>
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-glass rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
              {testimonial.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-slate-100 line-clamp-3">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <p className="mt-2 text-sm font-medium text-white">{testimonial.name}</p>
              <p className="text-xs text-slate-400">
                {testimonial.role} · {testimonial.company}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {TESTIMONIALS.map((item, i) => (
              <button
                key={item.name}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all ${
                  i === index ? "w-5 bg-indigo-400" : "w-1.5 bg-white/25 hover:bg-white/40"
                }`}
                aria-label={`Show testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
        {[
          { value: "50M+", label: "Profiles" },
          { value: "40+", label: "Filters" },
          { value: "100", label: "Free tokens" },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-lg font-semibold text-white">{stat.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
