import type { ReactNode } from "react";
import AuthBrandPanel from "@/components/AuthBrandPanel";
import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";

type AuthShellProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  wide?: boolean;
};

export default function AuthShell({
  children,
  title,
  subtitle,
  wide = false,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:max-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden">
      <AuthBrandPanel />

      <div className="flex min-h-screen flex-col bg-white">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div className="lg:hidden">
            <BrandLogo href="/" />
          </div>
          <Link
            href="/"
            className="ml-auto text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Back to home
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8 lg:px-10">
          <div className={`w-full ${wide ? "max-w-xl" : "max-w-[400px]"}`}>
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-[15px]">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
