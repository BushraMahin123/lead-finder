import { Suspense } from "react";
import AppNav from "@/components/AppNav";
import CreditBalance from "@/components/CreditBalance";
import UserMenu from "@/components/UserMenu";

function NavFallback() {
  return (
    <div className="flex items-center gap-6">
      <p className="text-sm font-semibold text-slate-900">Lead Finder</p>
    </div>
  );
}

export default function AppHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Suspense fallback={<NavFallback />}>
          <AppNav />
        </Suspense>
        <div className="flex items-center gap-3">
          <CreditBalance />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
