import { IconArrowUp, IconSparkles } from "@/components/icons";

type AISearchIconSize = "sm" | "md" | "lg";

const badgeClass: Record<AISearchIconSize, string> = {
  sm: "h-7 w-7 rounded-lg",
  md: "h-9 w-9 rounded-xl",
  lg: "h-10 w-10 rounded-xl",
};

const iconClass: Record<AISearchIconSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function AISearchIconBadge({
  size = "md",
  className = "",
}: {
  size?: AISearchIconSize;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-indigo-600 text-white shadow-sm shadow-indigo-300/40 ${badgeClass[size]} ${className}`}
      aria-hidden
    >
      <IconSparkles className={iconClass[size]} />
    </span>
  );
}

export function AISearchHeading({
  title = "Search with AI",
  size = "sm",
  layout = "inline",
}: {
  title?: string;
  size?: AISearchIconSize;
  layout?: "inline" | "stacked";
}) {
  if (layout === "stacked") {
    return (
      <div className="text-center">
        <AISearchIconBadge size={size} className="mx-auto" />
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h2>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <AISearchIconBadge size={size} />
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </div>
  );
}

export function AISearchSubmitButton({
  disabled = false,
  onClick,
  ariaLabel = "Search with AI",
  size = "md",
  type = "button",
}: {
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  size?: "sm" | "md";
  type?: "button" | "submit";
}) {
  const dimensions = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex ${dimensions} items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm shadow-indigo-200/60 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <IconArrowUp className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}
