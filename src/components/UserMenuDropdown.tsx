"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useBillingBalance } from "@/hooks/useBillingBalance";

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

interface UserMenuDropdownProps {
  email: string;
  name: string;
}

export default function UserMenuDropdown({ email, name }: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { balance } = useBillingBalance();
  const initials = initialsFromEmail(email);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(String(data.error ?? "Could not open billing portal"));
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not open billing portal";
      window.alert(message);
    } finally {
      setPortalLoading(false);
      setOpen(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2.5 transition hover:border-slate-200 hover:bg-slate-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80">
          {initials}
        </span>
        <span className="hidden max-w-[7rem] truncate text-sm font-medium text-slate-700 sm:inline lg:max-w-[9rem]">
          {name}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`hidden h-4 w-4 text-slate-400 transition sm:block ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/60"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
            {balance && (
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {balance.balance.toLocaleString()} tokens
                </span>
                {" · "}
                {balance.planName} plan
              </p>
            )}
          </div>

          <div className="py-1">
            <MenuLink href="/dashboard" onNavigate={() => setOpen(false)}>
              Tables
            </MenuLink>
            <MenuLink href="/?view=search" onNavigate={() => setOpen(false)}>
              Lead search
            </MenuLink>
            <MenuLink href="/pricing" onNavigate={() => setOpen(false)}>
              Pricing & tokens
            </MenuLink>
            <MenuButton
              onClick={() => void openBillingPortal()}
              disabled={portalLoading}
            >
              {portalLoading ? "Opening billing…" : "Manage subscription"}
            </MenuButton>
          </div>

          <div className="border-t border-slate-100 py-1">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}

function MenuButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
