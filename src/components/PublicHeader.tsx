"use client";

import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useState } from "react";

type PublicHeaderProps = {
  active?: "home" | "pricing" | "contact";
  waitlistMode?: boolean;
};

const navLinkClass = (active: boolean) =>
  `text-sm font-medium transition-colors ${
    active ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
  }`;

export default function PublicHeader({
  active = "home",
  waitlistMode = false,
}: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <BrandLogo href="/" />
          <nav className="hidden items-center gap-8 lg:flex">
            <Link href="/#features" className={navLinkClass(false)}>
              Features
            </Link>
            {waitlistMode ? (
              <>
                <Link href="/#how-it-works" className={navLinkClass(false)}>
                  How it works
                </Link>
                <Link href="/#pricing" className={navLinkClass(false)}>
                  Pricing
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/pricing"
                  className={navLinkClass(active === "pricing")}
                >
                  Pricing
                </Link>
                <Link
                  href="/contact"
                  className={navLinkClass(active === "contact")}
                >
                  Contact
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100"
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
          <div className="hidden lg:flex items-center gap-2">
            {waitlistMode ? (
              <>
                <Link href="/login" className="btn btn-ghost">
                  Sign in
                </Link>
                <a href="#waitlist" className="btn btn-primary">
                  Join waitlist
                </a>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-primary">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation menu */}
      {mobileMenuOpen && (
        <nav className="lg:hidden absolute top-16 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 shadow-lg">
          <div className="flex flex-col gap-1">
            <Link 
              href="/#features" 
              className="rounded-lg px-3 py-3 text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            {waitlistMode ? (
              <>
                <Link 
                  href="/#how-it-works" 
                  className="rounded-lg px-3 py-3 text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How it works
                </Link>
                <Link 
                  href="/#pricing" 
                  className="rounded-lg px-3 py-3 text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/pricing" 
                  className={`rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                    active === "pricing"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link 
                  href="/contact" 
                  className={`rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                    active === "contact"
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
              </>
            )}
            <div className="border-t border-slate-100 pt-2 mt-2">
              <Link
                href="/login"
                className="block rounded-lg px-3 py-3 text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              {waitlistMode ? (
                <a
                  href="#waitlist"
                  className="block rounded-lg px-3 py-3 text-sm font-medium transition-colors text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Join waitlist
                </a>
              ) : (
                <Link
                  href="/signup"
                  className="block rounded-lg px-3 py-3 text-sm font-medium transition-colors text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get started
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
