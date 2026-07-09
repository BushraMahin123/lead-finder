import { Suspense } from "react";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import LeadFinder from "@/components/LeadFinder";
import PublicLanding from "@/components/PublicLanding";
import WaitlistLanding from "@/components/WaitlistLanding";
import { createClient } from "@/lib/supabase/server";
import { isWaitlistMode } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);
  const userEmail =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  if (!isAuthenticated) {
    if (params.view === "search") {
      redirect("/login?next=/?view=search");
    }

    if (isWaitlistMode()) {
      return <WaitlistLanding />;
    }

    return <PublicLanding />;
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden page-gradient">
      <AppHeader />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-slate-500">
            Loading…
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <LeadFinder userEmail={userEmail} />
        </div>
      </Suspense>
    </main>
  );
}
