import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  inverted?: boolean;
  className?: string;
};

export default function BrandLogo({
  href = "/",
  inverted = false,
  className = "",
}: BrandLogoProps) {
  const mark = (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
        inverted
          ? "bg-white/10 text-white ring-1 ring-white/20"
          : "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4"
        aria-hidden
      >
        <path
          d="M12 3L4 8v8l8 5 8-5V8l-8-5z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.25" fill="currentColor" />
      </svg>
    </span>
  );

  const label = (
    <span
      className={`text-[0.95rem] font-semibold tracking-tight ${
        inverted ? "text-white" : "text-slate-900"
      }`}
    >
      Lead Finder
    </span>
  );

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      {label}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex transition opacity-100 hover:opacity-90">
      {content}
    </Link>
  );
}
