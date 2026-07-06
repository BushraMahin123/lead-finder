"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AISearchBar from "@/components/AISearchBar";
import AISearchPreview from "@/components/AISearchPreview";
import FilterPanel from "@/components/FilterPanel";
import LandingHero from "@/components/LandingHero";
import SaveContactsModal, {
  type SaveContactsConfirmPayload,
} from "@/components/SaveContactsModal";
import SearchEmptyState from "@/components/SearchEmptyState";
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

interface LeadFinderProps {
  userEmail?: string | null;
}

export default function LeadFinder({ userEmail = null }: LeadFinderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view: AppView =
    searchParams.get("view") === "search" ? "search" : "landing";
  const templateQuery = searchParams.get("q");

  const search = usePaginatedSearch({
    onUnauthorized: () => router.push("/login?next=/?view=search"),
  });

  const [hasResults, setHasResults] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<Partial<SearchFilters> | null>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiQuery, setAiQuery] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSaveContext | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignSaveError, setCampaignSaveError] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const templateHandled = useRef(false);

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
    setAiInput("");
  }

  function handleApiError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      router.push("/login?next=/?view=search");
      return "Your session expired. Redirecting to sign in…";
    }

    if (err instanceof ApiError && err.status === 402) {
      return "Not enough tokens. Visit Pricing to buy more or upgrade your plan.";
    }

    if (err instanceof ApiError && err.status === 429) {
      return "AI search rate limit reached. Wait a minute or use manual filters.";
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
    setAiInput(query);
    search.setError(null);
    setAiWarning(null);

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
      const warning =
        typeof parseData.warning === "string" ? parseData.warning : null;
      if (warning) {
        setAiWarning(warning);
      }
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

  useEffect(() => {
    if (!templateQuery || templateHandled.current || view !== "search") return;
    templateHandled.current = true;
    setAiInput(templateQuery);
    void handleAISearch(templateQuery);
  }, [templateQuery, view]);

  function handleClearFilters() {
    resetSearchState();
    setAiWarning(null);
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

  const showPreview = hasResults || (search.loading && !aiParsing);
  const showEmpty = !hasResults && !search.loading && !aiParsing;

  if (view === "landing") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <LandingHero
          userEmail={userEmail}
          onStart={openSearchView}
          onAISearch={handleAISearch}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-slate-50/50">
      <aside
        className={`flex h-full shrink-0 flex-col transition-all ${
          sidebarCollapsed ? "w-12" : "w-full max-w-[18rem] lg:max-w-[20rem]"
        }`}
      >
        <FilterPanel
          loading={search.loading}
          onSearch={runSearch}
          onBack={openLandingView}
          appliedFilters={appliedFilters}
          aiQuery={aiQuery}
          onAISearch={handleAISearch}
          onClearFilters={handleClearFilters}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          aiAdjusting={aiParsing}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <AISearchBar
          value={aiInput}
          onChange={setAiInput}
          onSearch={handleAISearch}
          loading={aiParsing || search.loading}
          loadingMessage={
            aiParsing ? "Gemini is building your filters…" : undefined
          }
          error={showEmpty ? search.error : null}
          warning={aiWarning}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {aiParsing && !hasResults ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                <p className="mt-3 font-medium text-indigo-700">
                  Adjusting filters from your prompt…
                </p>
              </div>
            </div>
          ) : showEmpty ? (
            <SearchEmptyState onTemplateSelect={(q) => void handleAISearch(q)} />
          ) : showPreview ? (
            <>
              {search.error && (
                <div className="px-6 pt-4">
                  <div className="alert-error mx-auto max-w-6xl">{search.error}</div>
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
      </div>

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
