"use client";

import type { ReactNode } from "react";

export interface SubFilterTab {
  id: string;
  label: string;
}

interface SubFilterTabsProps {
  tabs: SubFilterTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export default function SubFilterTabs({
  tabs,
  activeTab,
  onTabChange,
  children,
}: SubFilterTabsProps) {
  if (tabs.length <= 1) {
    return <div className="space-y-2">{children}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`w-full rounded-lg border px-2 py-2 text-xs font-medium transition ${
              activeTab === tab.id
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
