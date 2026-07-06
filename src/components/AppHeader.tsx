import { Suspense } from "react";
import AppNav from "@/components/AppNav";
import CreditBalance from "@/components/CreditBalance";
import UserMenu from "@/components/UserMenu";

function NavFallback() {
  return (
    <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-100" />
  );
}

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
