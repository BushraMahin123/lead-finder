"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AISearchPreview from "@/components/AISearchPreview";
import AISearchSection from "@/components/AISearchSection";
import FilterPanel from "@/components/FilterPanel";
import LandingHero from "@/components/LandingHero";
import SaveContactsModal, {
  type SaveContactsConfirmPayload,
} from "@/components/SaveContactsModal";
import SelectCampaignModal, {
  type SelectCampaignPayload,
} from "@/components/SelectCampaignModal";
import { usePaginatedSearch } from "@/hooks/usePaginatedSearch";
import { fetchJson, ApiError } from "@/lib/fetch-json";
import { AI_PREVIEW_PER_PAGE, SEARCH_RESULTS_PER_PAGE } from "@/lib/paginated-search-client";
import type { SearchFilters } from "@/types/lead";

type AppView = "landing" | "search";

interface PendingSaveContext {
  payload: SaveContactsConfirmPayload;
  filters: SearchFilters;
  aiQuery: string | null;
  totalEntries: number;
}

export default function LeadFinder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view: AppView =
    searchParams.get("view") === "search" ? "search" : "landing";

  const search = usePaginatedSearch({
    onUnauthorized: () => router.push("/login?next=/?view=search"),
  });

  const [hasResults, setHasResults] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<Partial<SearchFilters> | null>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiQuery, setAiQuery] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSaveContext | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignSaveError, setCampaignSaveError] = useState<string | null>(null);

  function openSearchView() {
    router.push("/?view=search");
  }

  function openLandingView() {
    router.push("/");
  }

  function resetSearchState() {
    search.reset();
    setHasResults(false);
    setAppliedFilters(null);
    setAiQuery(null);
  }

  function handleApiError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      router.push("/login?next=/?view=search");
      return "Your session expired. Redirecting to sign in…";
    }

    if (err instanceof ApiError && err.status === 402) {
      return "Not enough tokens. Visit Pricing to buy more or upgrade your plan.";
    }

    return err instanceof Error ? err.message : "Something went wrong";
  }

  async function executePreviewSearch(nextFilters: SearchFilters) {
    const normalizedFilters: SearchFilters = {
      ...nextFilters,
      page: 1,
      perPage: AI_PREVIEW_PER_PAGE,
    };

    search.setError(null);

    if (view !== "search") {
      router.push("/?view=search");
    }

    await search.runSearch(normalizedFilters, { prefetch: false });
    setHasResults(true);
  }

  async function runSearch(nextFilters: SearchFilters) {
    setAiQuery(null);
    setAppliedFilters(null);

    try {
      await executePreviewSearch(nextFilters);
    } catch (err) {
      setHasResults(false);
      search.setError(handleApiError(err));
    }
  }

  async function handleAISearch(query: string) {
    setAiParsing(true);
    setAiQuery(query);
    search.setError(null);

    if (view !== "search") {
      router.push("/?view=search");
    }

    try {
      const { response: parseResponse, data: parseData } = await fetchJson("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!parseResponse.ok) {
        throw new Error(String(parseData.error ?? "Could not interpret your search"));
      }

      const parsedFilters = parseData.filters as Partial<SearchFilters> | undefined;
      const nextFilters = {
        ...parsedFilters,
        searchMode: parsedFilters?.linkedInUrls ? "linkedin" : "people",
        page: 1,
        perPage: AI_PREVIEW_PER_PAGE,
      } as SearchFilters;

      setAppliedFilters(parsedFilters ?? null);
      await executePreviewSearch(nextFilters);
    } catch (err) {
      setHasResults(false);
      search.setError(handleApiError(err));
    } finally {
      setAiParsing(false);
    }
  }

  function handleClearFilters() {
    resetSearchState();
  }

  function handleSaveContacts() {
    if (!search.filters || search.totalEntries === 0) return;
    setSaveModalOpen(true);
  }

  function handleSaveConfirm(payload: SaveContactsConfirmPayload) {
    if (!search.filters) return;

    setPendingSave({
      payload,
      filters: {
        ...search.filters,
        page: 1,
        perPage: SEARCH_RESULTS_PER_PAGE,
      },
      aiQuery,
      totalEntries: search.totalEntries,
    });
    setCampaignSaveError(null);
    setSaveModalOpen(false);
    setCampaignModalOpen(true);
  }

  function handleCampaignPrevious() {
    setCampaignModalOpen(false);
    setCampaignSaveError(null);
    setSaveModalOpen(true);
  }

  async function handleCampaignSave(selection: SelectCampaignPayload) {
    if (!pendingSave) return;

    setSavingCampaign(true);
    setCampaignSaveError(null);

    try {
      const { response, data } = await fetchJson("/api/campaigns/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selection.campaignId,
          name: selection.name,
          filters: pendingSave.filters,
          contactCount: pendingSave.payload.contactCount,
          enrichEmail: pendingSave.payload.enrichEmail,
          enrichPhone: pendingSave.payload.enrichPhone,
          aiQuery: pendingSave.aiQuery,
          totalEntries: pendingSave.totalEntries,
        }),
      });

      if (!response.ok) {
        throw new ApiError(
          String(data.error ?? "Failed to save contacts"),
          response.status,
        );
      }

      setCampaignModalOpen(false);
      setPendingSave(null);
      router.push("/dashboard");
    } catch (err) {
      setCampaignSaveError(handleApiError(err));
    } finally {
      setSavingCampaign(false);
    }
  }

  const showPrompt = !hasResults && !search.loading && !aiParsing;
  const showPreview = hasResults || (search.loading && !aiParsing);

  if (view === "landing") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <LandingHero onStart={openSearchView} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-white">
      <aside className="flex h-full w-full max-w-[18rem] shrink-0 flex-col border-r border-slate-200 bg-slate-50/40 lg:max-w-[20rem]">
        <FilterPanel
          loading={search.loading}
          onSearch={runSearch}
          onBack={openLandingView}
          appliedFilters={appliedFilters}
          aiQuery={aiQuery}
          onAISearch={handleAISearch}
          onClearFilters={handleClearFilters}
        />
      </aside>

      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col bg-white ${
          showPrompt || aiParsing || showPreview ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {showPrompt ? (
          <AISearchSection
            loading={search.loading || aiParsing}
            loadingMessage={
              aiParsing ? "Gemini is building your filters…" : undefined
            }
            error={search.error}
            onSearch={handleAISearch}
          />
        ) : aiParsing ? (
          <div className="flex h-full items-center justify-center px-6 py-8 text-sm text-slate-600">
            Gemini is building your filters…
          </div>
        ) : showPreview ? (
          <>
            {search.error && (
              <div className="px-6 pt-4">
                <div className="mx-auto max-w-6xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {search.error}
                </div>
              </div>
            )}
            <AISearchPreview
              people={search.people}
              totalEntries={search.totalEntries}
              loading={search.loading}
              isAiSearch={Boolean(aiQuery)}
              onSave={handleSaveContacts}
            />
          </>
        ) : null}
      </main>

      <SaveContactsModal
        open={saveModalOpen}
        maxAvailable={search.totalEntries}
        onClose={() => setSaveModalOpen(false)}
        onConfirm={handleSaveConfirm}
      />

      <SelectCampaignModal
        open={campaignModalOpen}
        saving={savingCampaign}
        error={campaignSaveError}
        onClose={() => {
          if (savingCampaign) return;
          setCampaignModalOpen(false);
          setCampaignSaveError(null);
        }}
        onPrevious={handleCampaignPrevious}
        onSave={handleCampaignSave}
      />
    </div>
  );
}
