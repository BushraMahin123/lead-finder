"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const TOOLTIP_WIDTH = 400;
const MAX_TOOLTIP_HEIGHT = 400;
const VIEWPORT_MARGIN = 8;

interface AiColumnValueCellProps {
  value: string;
}

function clampTooltipPosition(
  rect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
) {
  let left = rect.left + rect.width / 2 - tooltipWidth / 2;
  let top = rect.bottom + VIEWPORT_MARGIN;

  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, window.innerWidth - tooltipWidth - VIEWPORT_MARGIN),
  );

  if (top + tooltipHeight > window.innerHeight - VIEWPORT_MARGIN) {
    top = rect.top - tooltipHeight - VIEWPORT_MARGIN;
  }

  top = Math.max(VIEWPORT_MARGIN, top);

  return { top, left };
}

export default function AiColumnValueCell({ value }: AiColumnValueCellProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updateTruncation = useCallback(() => {
    const el = textRef.current;
    if (!el) {
      setIsTruncated(false);
      return;
    }
    setIsTruncated(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useEffect(() => {
    updateTruncation();

    const el = textRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => updateTruncation());
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, updateTruncation]);

  function showTooltip() {
    if (!isTruncated) return;
    setOpen(true);
  }

  function hideTooltip() {
    setOpen(false);
  }

  useLayoutEffect(() => {
    if (!open) return;

    const trigger = textRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const height = Math.min(tooltip.offsetHeight, MAX_TOOLTIP_HEIGHT);
    const width = Math.min(tooltip.offsetWidth, TOOLTIP_WIDTH);
    setPosition(clampTooltipPosition(trigger.getBoundingClientRect(), width, height));
  }, [open, value]);

  return (
    <>
      <span
        ref={textRef}
        tabIndex={isTruncated ? 0 : undefined}
        role={isTruncated ? "button" : undefined}
        aria-label={isTruncated ? "View full result" : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={`line-clamp-3 text-sm ${isTruncated ? "cursor-help" : ""}`}
      >
        {value}
      </span>
      {open && isTruncated && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          className="fixed z-[100] w-[400px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Full result
            </p>
          </div>
          <div className="max-h-[340px] overflow-auto p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
              {value}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
