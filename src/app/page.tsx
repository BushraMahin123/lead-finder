import { Suspense } from "react";
import AppHeader from "@/components/AppHeader";
import LeadFinder from "@/components/LeadFinder";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      <AppHeader />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-slate-500">
            Loading…
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <LeadFinder />
        </div>
      </Suspense>
    </main>
  );
}
