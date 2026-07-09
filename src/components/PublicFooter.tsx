import Link from "next/link";

type PublicFooterProps = {
  waitlistMode?: boolean;
};

export default function PublicFooter({ waitlistMode = false }: PublicFooterProps) {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} Lead Finder. All rights reserved.</p>
        <div className="flex items-center gap-6">
          {waitlistMode ? (
            <>
              <a href="#features" className="transition hover:text-slate-800">
                Features
              </a>
              <a href="#pricing" className="transition hover:text-slate-800">
                Pricing
              </a>
              <a href="#waitlist" className="transition hover:text-slate-800">
                Join waitlist
              </a>
            </>
          ) : (
            <>
              <Link href="/pricing" className="transition hover:text-slate-800">
                Pricing
              </Link>
              <Link href="/login" className="transition hover:text-slate-800">
                Sign in
              </Link>
              <Link href="/signup" className="transition hover:text-slate-800">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
