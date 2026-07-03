"use client";

import { useEffect, useMemo, useState } from "react";
import type { Campaign } from "@/types/campaign";

export interface SelectCampaignPayload {
  campaignId?: string;
  name?: string;
}

interface SelectCampaignModalProps {
  open: boolean;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onPrevious: () => void;
  onSave: (payload: SelectCampaignPayload) => void;
}

export default function SelectCampaignModal({
  open,
  saving = false,
  error = null,
  onClose,
  onPrevious,
  onSave,
}: SelectCampaignModalProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");

  useEffect(() => {
    if (!open) return;

    setSearchQuery("");
    setSelectedCampaignId(null);
    setCreatingNew(false);
    setNewCampaignName("");
    setLoadError(null);

    void (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/campaigns");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(String(data.error ?? "Failed to load tables"));
        }
        setCampaigns((data.campaigns as Campaign[] | undefined) ?? []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load tables");
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const filteredCampaigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return campaigns;
    return campaigns.filter((campaign) =>
      campaign.name.toLowerCase().includes(query),
    );
  }, [campaigns, searchQuery]);

  const canSave =
    !saving &&
    ((creatingNew && newCampaignName.trim().length > 0) ||
      (!creatingNew && selectedCampaignId !== null));

  if (!open) return null;

  function handleCreateNew() {
    setCreatingNew(true);
    setSelectedCampaignId(null);
  }

  function handleSelectExisting(campaignId: string) {
    setCreatingNew(false);
    setNewCampaignName("");
    setSelectedCampaignId(campaignId);
  }

  function handleSave() {
    if (!canSave) return;

    if (creatingNew) {
      onSave({ name: newCampaignName.trim() });
      return;
    }

    if (selectedCampaignId) {
      onSave({ campaignId: selectedCampaignId });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close select table dialog"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-campaign-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="select-campaign-title"
                className="text-xl font-semibold text-slate-900"
              >
                Select table
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a table to add your contacts to
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <label className="relative block">
            <span className="sr-only">Search tables</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tables..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <button
            type="button"
            onClick={handleCreateNew}
            className={`mt-4 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
              creatingNew
                ? "border-indigo-300 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-lg text-indigo-600">
              +
            </span>
            <span className="font-medium text-slate-900">Create new table</span>
          </button>

          {creatingNew && (
            <label className="mt-3 block text-sm text-slate-700">
              Table name
              <input
                type="text"
                value={newCampaignName}
                onChange={(event) => setNewCampaignName(event.target.value)}
                placeholder="e.g. Nike sales leads"
                autoFocus
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          )}

          {(error || loadError) && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error ?? loadError}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Loading tables…
              </p>
            ) : filteredCampaigns.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {campaigns.length === 0
                  ? "No tables yet. Create one above."
                  : "No tables match your search."}
              </p>
            ) : (
              filteredCampaigns.map((campaign) => {
                const selected = selectedCampaignId === campaign.id && !creatingNew;
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => handleSelectExisting(campaign.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {campaign.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {campaign.contactCount.toLocaleString()} contacts
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {campaign.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onPrevious}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {saving ? "Saving…" : "Save contacts"}
          </button>
        </div>
      </div>
    </div>
  );
}
