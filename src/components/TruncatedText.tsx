"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
} from "react";

type TruncatedTextProps = {
  text: string;
  as?: ElementType;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "title" | "children" | "className">;

/**
 * Truncates overflowing text with an ellipsis and shows the full value on hover.
 */
export default function TruncatedText({
  text,
  as: Tag = "span",
  className,
  ...rest
}: TruncatedTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = ref.current;
    if (!el) {
      setIsTruncated(false);
      return;
    }
    setIsTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    updateOverflow();

    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => updateOverflow());
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, updateOverflow]);

  return (
    <div className="group/truncate relative min-w-0 max-w-full">
      <Tag
        ref={ref}
        className={className}
        title={isTruncated ? text : undefined}
        aria-label={isTruncated ? text : undefined}
        {...rest}
      >
        {text}
      </Tag>
      {isTruncated ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 hidden max-w-[min(20rem,70vw)] rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium leading-snug whitespace-normal text-white shadow-lg group-hover/truncate:block"
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}
