"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function AppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearchView =
    pathname === "/" && searchParams.get("view") === "search";
  const isTablesView =
    pathname === "/dashboard" || pathname.startsWith("/campaigns/");

  return (
    <div className="flex items-center gap-6">
      <Link href="/" className="text-sm font-semibold text-slate-900">
        Lead Finder
      </Link>
      <nav className="hidden items-center gap-4 sm:flex">
        <Link
          href="/dashboard"
          className={`text-sm font-medium transition ${
            isTablesView
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Tables
        </Link>
        <Link
          href="/?view=search"
          className={`text-sm font-medium transition ${
            isSearchView
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
            >
              Lead search
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition ${
                pathname === "/pricing"
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Pricing
            </Link>
      </nav>
    </div>
  );
}
