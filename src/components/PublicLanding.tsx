import Link from "next/link";
import DashboardMockup from "@/components/DashboardMockup";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import SocialProofLogos from "@/components/SocialProofLogos";

const FEATURES = [
  {
    title: "Precision filters",
    description:
      "Target by job title, location, seniority, department, industry, company size, and domain.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "AI-assisted search",
    description:
      "Describe your ideal prospect in plain English and watch filters adjust in real time.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path d="M12 2l1.2 3.6L17 7l-3.8 1.2L12 12l-1.2-3.8L7 7l3.8-1.4L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Contact enrichment",
    description:
      "Reveal verified emails and phone numbers, then save leads to organized campaign tables.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path d="M4 7h16v10H4V7zm4 3v4m4-4v4m4-4v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

export default function PublicLanding() {
  return (
    <div className="flex min-h-screen flex-col page-gradient">
      <PublicHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 glow-radial" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-8">
                <span className="badge">B2B people search</span>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
                  Find the right people at the right companies
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-slate-600">
                  Search millions of professional profiles, refine with powerful
                  filters, and export contact-ready leads for your outreach
                  campaigns.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/signup" className="btn btn-primary px-6 py-3 text-base">
                    Start free
                  </Link>
                  <Link href="/pricing" className="btn btn-secondary px-6 py-3 text-base">
                    View pricing
                  </Link>
                </div>
                <p className="text-sm text-slate-500">
                  100 free tokens at signup · No credit card required
                </p>
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
                Built for modern outbound teams
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Everything you need to go from ICP definition to a contact list
                you can actually work.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
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

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 px-8 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute inset-0 mesh-bg opacity-15" />
            <h2 className="relative text-3xl font-semibold tracking-tight text-white">
              Ready to build your next pipeline?
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-base text-slate-400">
              Create an account in under a minute and start searching with your
              free token balance.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Create free account
              </Link>
              <Link href="/login" className="btn border border-slate-600 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-900">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
