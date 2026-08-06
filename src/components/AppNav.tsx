"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSearchView =
    pathname === "/" && searchParams.get("view") === "search";
  const isTablesView =
    pathname === "/dashboard" || pathname.startsWith("/campaigns/");
  const isCallsView = pathname === "/calls" || pathname.startsWith("/calls/");

  return (
    <div className="flex min-w-0 items-center gap-3 xl:gap-6">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="xl:hidden flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        aria-expanded={mobileMenuOpen}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {mobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      
      <BrandLogo href="/" />

      {/* Desktop navigation */}
      <nav className="hidden items-center gap-1 xl:flex">
        <Link href="/dashboard" className={navItemClass(isTablesView)}>
          Tables
        </Link>
        <Link href="/?view=search" className={navItemClass(isSearchView)}>
          Lead search
        </Link>
        <Link href="/calls" className={navItemClass(isCallsView)}>
          Call logs
        </Link>
        <Link
          href="/pricing"
          className={navItemClass(pathname === "/pricing")}
        >
          Pricing
        </Link>
        <Link
          href="/contact"
          className={navItemClass(pathname === "/contact")}
        >
          Contact
        </Link>
      </nav>

      {/* Mobile navigation menu */}
      {mobileMenuOpen && (
        <nav className="absolute top-14 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 xl:hidden shadow-lg">
          <div className="flex flex-col gap-1">
            <Link 
              href="/dashboard" 
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isTablesView
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Tables
            </Link>
            <Link 
              href="/?view=search" 
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isSearchView
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Lead search
            </Link>
            <Link
              href="/calls"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isCallsView
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Call logs
            </Link>
            <Link 
              href="/pricing" 
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/pricing"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              href="/contact" 
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === "/contact"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
