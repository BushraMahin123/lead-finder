"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

function navItemClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-slate-100 text-slate-900"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  }`;
}

export default function AppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearchView =
    pathname === "/" && searchParams.get("view") === "search";
  const isTablesView =
    pathname === "/dashboard" || pathname.startsWith("/campaigns/");

  return (
    <div className="flex min-w-0 items-center gap-6">
      <BrandLogo href="/" />
      <nav className="hidden items-center gap-1 sm:flex">
        <Link href="/dashboard" className={navItemClass(isTablesView)}>
          Tables
        </Link>
        <Link href="/?view=search" className={navItemClass(isSearchView)}>
          Lead search
        </Link>
        <Link
          href="/pricing"
          className={navItemClass(pathname === "/pricing")}
        >
          Pricing
        </Link>
      </nav>
    </div>
  );
}
