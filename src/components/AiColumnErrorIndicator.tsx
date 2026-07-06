"use client";

import { useLayoutEffect, useRef, useState } from "react";

const TOOLTIP_WIDTH = 400;
const MAX_TOOLTIP_HEIGHT = 400;
const VIEWPORT_MARGIN = 8;

interface AiColumnErrorIndicatorProps {
  message: string;
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

export default function AiColumnErrorIndicator({
  message,
}: AiColumnErrorIndicatorProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function showTooltip() {
    setOpen(true);
  }

  function hideTooltip() {
    setOpen(false);
  }

  useLayoutEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const height = Math.min(tooltip.offsetHeight, MAX_TOOLTIP_HEIGHT);
    const width = Math.min(tooltip.offsetWidth, TOOLTIP_WIDTH);
    setPosition(clampTooltipPosition(trigger.getBoundingClientRect(), width, height));
  }, [open, message]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        role="button"
        aria-label="View error details"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 transition hover:bg-red-200"
      >
        !
      </span>
      {open && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          className="fixed z-[100] w-[400px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-red-200 bg-white shadow-2xl"
        >
          <div className="border-b border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Error details
            </p>
          </div>
          <div className="max-h-[340px] overflow-auto p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
              {message}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
