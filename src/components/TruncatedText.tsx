"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
} from "react";

const MAX_TOOLTIP_WIDTH = 320;
const VIEWPORT_MARGIN = 8;

type TruncatedTextProps = {
  text: string;
  as?: ElementType;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "title" | "children" | "className">;

function clampTooltipPosition(
  rect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
) {
  let left = rect.left;
  let top = rect.top - tooltipHeight - 6;

  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, window.innerWidth - tooltipWidth - VIEWPORT_MARGIN),
  );

  if (top < VIEWPORT_MARGIN) {
    top = rect.bottom + 6;
  }

  return { top, left };
}

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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

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

  useEffect(() => {
    if (!open) return;

    function close() {
      setOpen(false);
    }

    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const trigger = ref.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    setPosition(
      clampTooltipPosition(
        trigger.getBoundingClientRect(),
        Math.min(tooltip.offsetWidth, MAX_TOOLTIP_WIDTH),
        tooltip.offsetHeight,
      ),
    );
  }, [open, text]);

  return (
    <>
      <Tag
        {...rest}
        ref={ref}
        className={className}
        aria-label={isTruncated ? text : undefined}
        onMouseEnter={() => isTruncated && setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {text}
      </Tag>
      {open && isTruncated && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            top: position.top,
            left: position.left,
            maxWidth: MAX_TOOLTIP_WIDTH,
          }}
          className="pointer-events-none fixed z-[100] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-snug whitespace-normal break-words text-slate-700 shadow-xl"
        >
          {text}
        </div>
      )}
    </>
  );
}
