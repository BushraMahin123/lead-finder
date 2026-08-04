type IconProps = {
  className?: string;
};

const defaults = "h-5 w-5 shrink-0";

export function IconSearch({ className = defaults }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M16 16l5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPlus({ className = defaults }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSparkles({ className = defaults }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3 3 0 0 0 2.06 2.06l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3 3 0 0 0-2.06 2.06l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3 3 0 0 0-2.06-2.06l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3 3 0 0 0 2.06-2.06l.813-2.846A.75.75 0 0 1 9 4.5ZM17.25 3a.75.75 0 0 1 .721.544l.329 1.152a1.5 1.5 0 0 0 1.03 1.03l1.152.329a.75.75 0 0 1 0 1.442l-1.152.329a1.5 1.5 0 0 0-1.03 1.03l-.329 1.152a.75.75 0 0 1-1.442 0l-.329-1.152a1.5 1.5 0 0 0-1.03-1.03l-1.152-.329a.75.75 0 0 1 0-1.442l1.152-.329a1.5 1.5 0 0 0 1.03-1.03l.329-1.152A.75.75 0 0 1 17.25 3ZM14.25 17.25a.75.75 0 0 1 .721.544l.262.916a1.125 1.125 0 0 0 .773.773l.916.262a.75.75 0 0 1 0 1.442l-.916.262a1.125 1.125 0 0 0-.773.773l-.262.916a.75.75 0 0 1-1.442 0l-.262-.916a1.125 1.125 0 0 0-.773-.773l-.916-.262a.75.75 0 0 1 0-1.442l.916-.262a1.125 1.125 0 0 0 .773-.773l.262-.916a.75.75 0 0 1 .721-.544Z"
      />
    </svg>
  );
}

export function IconArrowUp({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 19V5M7 10l5-5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCoins({ className = defaults }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 6v12M8.25 15.75A4.5 4.5 0 0 1 12 18a4.5 4.5 0 0 1 3.75-2.25M15.75 8.25A4.5 4.5 0 0 0 12 6a4.5 4.5 0 0 0-3.75 2.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function IconUsers({ className = defaults }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M15 19.128a9.38 9.38 0 0 0 2.1.125 4.5 4.5 0 0 0 4.4-5.123 3.25 3.25 0 0 0-3.3-3.75h-.806M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.26a3.25 3.25 0 0 1 3.3-3.753h.806M12 11.25a4.125 4.125 0 1 0 0-8.25 4.125 4.125 0 0 0 0 8.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTable({ className = defaults }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M3.75 9.75h16.5M8.25 9.75v10.5M15.75 9.75v10.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconClock({ className = defaults }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChevronRight({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconArrowRight({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPhone({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function IconPhoneOff({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67" />
      <path d="M5.1 5.1A19.79 19.79 0 0 0 2.04 13.8a2 2 0 0 0 2.07 2.12c.96.127 1.9.361 2.81.7a2 2 0 0 0 2.11-.45l1.27-1.27" />
      <path d="M22 2 2 22" />
    </svg>
  );
}

export function IconMic({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

export function IconMicOff({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m2 2 20 20" />
      <path d="M10.5 5.5A3 3 0 0 1 15 8v3.5" />
      <path d="M8.5 8.5V12a3.5 3.5 0 0 0 5.4 2.9" />
      <path d="M19 10v2a7 7 0 0 1-11.2 5.5" />
      <path d="M5 10v2a7 7 0 0 0 .7 3" />
      <path d="M12 19v3" />
    </svg>
  );
}

export function IconCopy({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="9"
        y="9"
        width="13"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
