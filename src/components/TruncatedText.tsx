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
 * Renders truncated text and only sets the native tooltip when content overflows.
 */
export default function TruncatedText({
  text,
  as: Tag = "span",
  className,
  ...rest
}: TruncatedTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [tooltip, setTooltip] = useState<string | undefined>(undefined);

  const updateOverflow = useCallback(() => {
    const el = ref.current;
    if (!el) {
      setTooltip(undefined);
      return;
    }
    setTooltip(el.scrollWidth > el.clientWidth + 1 ? text : undefined);
  }, [text]);

  useEffect(() => {
    updateOverflow();

    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => updateOverflow());
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateOverflow]);

  return (
    <Tag
      ref={ref}
      className={className}
      title={tooltip}
      {...rest}
    >
      {text}
    </Tag>
  );
}
