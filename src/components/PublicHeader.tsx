import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

type PublicHeaderProps = {
  active?: "home" | "pricing";
};

const navLinkClass = (active: boolean) =>
  `text-sm font-medium transition-colors ${
    active
      ? "text-slate-900"
      : "text-slate-600 hover:text-slate-900"
  }`;

export default function PublicHeader({ active = "home" }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <BrandLogo href="/" />
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/#features" className={navLinkClass(false)}>
              Features
            </Link>
            <Link
              href="/pricing"
              className={navLinkClass(active === "pricing")}
            >
              Pricing
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
