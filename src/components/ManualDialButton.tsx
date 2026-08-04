"use client";

import { IconPhone } from "@/components/icons";
import { useSoftphoneOptional } from "@/components/SoftphoneProvider";

export default function ManualDialButton() {
  const softphone = useSoftphoneOptional();
  if (!softphone) return null;

  return (
    <button
      type="button"
      onClick={() => softphone.openManualDial()}
      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
      title="Open dial pad"
    >
      <IconPhone className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Dial</span>
    </button>
  );
}
