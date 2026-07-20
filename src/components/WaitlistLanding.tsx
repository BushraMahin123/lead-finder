import DashboardMockup from "@/components/DashboardMockup";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import SocialProofLogos from "@/components/SocialProofLogos";
import WaitlistForm from "@/components/WaitlistForm";
import {
  FREE_LIFETIME_TOKENS,
  SUBSCRIPTION_PLANS,
  formatTokenGrant,
} from "@/lib/billing/plans";

const FEATURES = [
  {
    title: "Precision filters",
    description:
      "Target by job title, location, seniority, department, industry, company size, domain, funding, tech stack, and more.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M4 6h16M7 12h10M10 18h4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "AI-assisted search",
    description:
      "Describe your ideal prospect in plain English. LEADMAGPRO builds the filter stack for you in seconds.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M12 2l1.2 3.6L17 7l-3.8 1.2L12 12l-1.2-3.8L7 7l3.8-1.4L12 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Contact enrichment",
    description:
      "Reveal verified emails and phone numbers, then save leads into organized campaign tables ready for outreach.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M4 7h16v10H4V7zm4 3v4m4-4v4m4-4v4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Saved contact tables",
    description:
      "Keep every search as a living campaign. Track status, add custom AI columns, and export when you're ready.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M4 5h16v14H4V5zm0 4h16M10 5v14"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "AI column enrichment",
    description:
      "Ask Gemini custom questions per contact—fit scores, personalization angles, or research notes—without leaving the table.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M12 3v3m0 12v3M3 12h3m12 0h3M6.3 6.3l2.1 2.1m7.2 7.2l2.1 2.1m0-11.4l-2.1 2.1M8.4 15.6l-2.1 2.1"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Token-based pricing",
    description:
      "Pay only for what you use. Cached searches are free. Start with a free token grant—no card required at launch.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M12 3c4.4 0 8 2.2 8 5s-3.6 5-8 5-8-2.2-8-5 3.6-5 8-5zm0 10c4.4 0 8 2.2 8 5s-3.6 5-8 5-8-2.2-8-5 3.6-5 8-5z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
] as const;

const STEPS = [
  {
    step: "01",
    title: "Describe your ICP",
    description:
      "Type a natural-language brief or dial in filters—title, seniority, industry, company size, and more.",
  },
  {
    step: "02",
    title: "Review matching people",
    description:
      "Browse professional profiles with company context, then refine until the list matches your outbound motion.",
  },
  {
    step: "03",
    title: "Enrich & export",
    description:
      "Unlock emails and phones, enrich with AI columns, save to a campaign table, and push into your outreach stack.",
  },
] as const;

const HIGHLIGHT_PLANS = SUBSCRIPTION_PLANS.filter((plan) =>
  ["free", "starter", "pro"].includes(plan.id),
);

export default function WaitlistLanding() {
  return (
    <div className="flex min-h-screen flex-col page-gradient">
      <PublicHeader waitlistMode />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 glow-radial" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-8">
                <span className="badge">Early access · Waitlist open</span>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
                  Find the right people at the right companies
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-slate-600">
                  LEADMAGPRO is a B2B people search built for outbound teams.
                  Search millions of profiles, refine with powerful filters, and
                  export contact-ready leads—we&apos;re opening access in waves.
                </p>
                <div id="waitlist" className="max-w-md scroll-mt-28">
                  <WaitlistForm />
                </div>
              </div>
              <DashboardMockup />
            </div>
          </div>
        </section>

        <SocialProofLogos />

        <section id="features" className="section-pattern py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="section-label">Platform</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Everything modern outbound needs
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                From ICP definition to a contact list you can actually work—
                search, enrich, organize, and personalize in one workspace.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="card p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    {feature.icon}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="section-label">Workflow</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                From brief to pipeline in three steps
              </h2>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((item) => (
                <div key={item.step} className="relative">
                  <p className="text-sm font-semibold tracking-wide text-indigo-600">
                    {item.step}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="section-pattern py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="section-label">Pricing</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Simple token-based plans
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Start with {FREE_LIFETIME_TOKENS} free tokens at launch. Upgrade
                when your outbound volume grows—cached searches stay free.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {HIGHLIGHT_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`card p-6 ${
                    plan.highlighted
                      ? "ring-2 ring-indigo-500 ring-offset-2"
                      : ""
                  }`}
                >
                  {plan.highlighted ? (
                    <span className="badge mb-3">Most popular</span>
                  ) : null}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
                  <p className="mt-5">
                    <span className="text-3xl font-semibold tracking-tight text-slate-900">
                      {plan.priceMonthly === 0 ? "Free" : `$${plan.priceMonthly}`}
                    </span>
                    {plan.priceMonthly > 0 ? (
                      <span className="text-sm text-slate-500"> / month</span>
                    ) : null}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex gap-2 text-sm text-slate-600"
                      >
                        <span className="mt-0.5 text-indigo-600" aria-hidden>
                          ✓
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-slate-500">
              Growth and Agency plans available at launch — up to{" "}
              {formatTokenGrant(55_000)} tokens / month for high-volume teams.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 px-8 py-14 text-center text-white sm:px-12">
            <div className="pointer-events-none absolute inset-0 mesh-bg opacity-15" />
            <h2 className="relative text-3xl font-semibold tracking-tight text-white">
              Be first in line when we open the doors
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-base text-slate-300">
              Join the waitlist and we&apos;ll invite you as capacity opens.
              Early members get priority access and the free token grant.
            </p>
            <div className="relative mx-auto mt-8 max-w-md">
              <a href="#waitlist" className="btn bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Join the waitlist
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter waitlistMode />
    </div>
  );
}
