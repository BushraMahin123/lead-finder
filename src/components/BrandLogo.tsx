import Image from "next/image";
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
  const content = (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <Image
        src="/favicon.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
        aria-hidden
      />
      <span
        className={`text-[0.95rem] font-bold tracking-tight uppercase ${
          inverted ? "text-white" : "text-slate-900"
        }`}
      >
        LeadMagPro
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex transition opacity-100 hover:opacity-90">
      {content}
    </Link>
  );
}
