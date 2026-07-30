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
import { notifyBillingBalanceRefresh } from "@/hooks/useBillingBalance";
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSaveContext | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [saveProgressLabel, setSaveProgressLabel] = useState<string | null>(null);
  const [campaignSaveError, setCampaignSaveError] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const templateHandled = useRef(false);

  useEffect(() => {
    if (!mobileFiltersOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileFiltersOpen]);

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

  // The panel is already seeded from the AI parse, so nextFilters carries the
  // AI-derived values plus any manual edits. Merging appliedFilters back in here
  // would resurrect values the user just removed.
  async function runSearch(nextFilters: SearchFilters) {
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
    setAiWarning(null);
    setHasResults(false);
    search.clearResults();
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

      // Refresh token balance after AI search parsing
      const tokensDebited = Number(parseData.tokensDebited ?? 0);
      if (tokensDebited > 0) {
        notifyBillingBalanceRefresh();
      }

      const parsedFilters = parseData.filters as Partial<SearchFilters> | undefined;
      const warning =
        typeof parseData.warning === "string" ? parseData.warning : null;
      if (warning) {
        setAiWarning(warning);
      }

      // A new query fully defines its own filter set. Carrying anything over
      // from the previous search would leave stale filters applied.
      const queryFilters: Partial<SearchFilters> = { ...parsedFilters };

      const nextFilters = {
        ...queryFilters,
        searchMode: queryFilters.linkedInUrls ? "linkedin" : "people",
        page: 1,
        perPage: AI_PREVIEW_PER_PAGE,
      } as SearchFilters;

      setAppliedFilters(queryFilters);
      setAiParsing(false);
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
    setSaveProgressLabel("Saving…");

    const targetCount = pendingSave.payload.contactCount;
    let campaignId = selection.campaignId?.trim() || undefined;
    let campaignName = selection.name?.trim() || undefined;
    let totalSaved = 0;
    let finalCampaignId: string | undefined = campaignId;
    let excludeLists: Array<{ id: string; count: number }> = [];

    async function saveChunk(remaining: number) {
      const maxAttempts = 3;
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const { response, data } = await fetchJson("/api/campaigns/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId,
              name: campaignId ? undefined : campaignName,
              filters: pendingSave!.filters,
              contactCount: remaining,
              enrichEmail: pendingSave!.payload.enrichEmail,
              enrichPhone: pendingSave!.payload.enrichPhone,
              aiQuery: pendingSave!.aiQuery,
              totalEntries: pendingSave!.totalEntries,
              excludeLists,
            }),
          });

          if (!response.ok) {
            throw new ApiError(
              String(data.error ?? "Failed to save contacts"),
              response.status,
            );
          }

          return data;
        } catch (error) {
          lastError = error;
          const message =
            error instanceof Error ? error.message : String(error);
          const retryable =
            error instanceof ApiError
              ? error.status >= 500 || error.status === 429
              : /fetch failed|timeout|network|502|503|504/i.test(message);

          if (!retryable || attempt >= maxAttempts) {
            throw error;
          }

          setSaveProgressLabel(
            `Connection issue — retrying chunk (${attempt}/${maxAttempts})…`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        }
      }

      throw lastError;
    }

    try {
      while (totalSaved < targetCount) {
        const remaining = targetCount - totalSaved;
        setSaveProgressLabel(
          `Saving ${totalSaved.toLocaleString()} / ${targetCount.toLocaleString()}…`,
        );

        const data = await saveChunk(remaining);

        const savedCount = Number(data.savedCount ?? 0);
        const nextCampaignId = (data.campaign as { id?: string } | undefined)?.id;
        if (nextCampaignId) {
          campaignId = nextCampaignId;
          finalCampaignId = nextCampaignId;
          campaignName = undefined;
        }

        if (Array.isArray(data.excludeLists)) {
          excludeLists = data.excludeLists as Array<{ id: string; count: number }>;
        }

        totalSaved += savedCount;
        setSaveProgressLabel(
          `Saving ${Math.min(totalSaved, targetCount).toLocaleString()} / ${targetCount.toLocaleString()}…`,
        );

        if (savedCount <= 0 || data.hasMore === false) {
          break;
        }
      }

      if (totalSaved <= 0) {
        throw new Error("No contacts could be saved for this search.");
      }

      // Refresh token balance after saving contacts (use the last successful response)
      // The tokensDebited should be tracked during the loop, but we'll use a default of 0 if not available
      const tokensDebited = 0; // TODO: Track actual tokens debited during the save loop
      if (tokensDebited > 0) {
        notifyBillingBalanceRefresh();
      }

      setCampaignModalOpen(false);
      setPendingSave(null);
      setSaveProgressLabel(null);
      router.push(finalCampaignId ? `/campaigns/${finalCampaignId}` : "/dashboard");
    } catch (err) {
      // Keep whatever was already saved — open the table instead of losing progress.
      if (totalSaved > 0 && finalCampaignId) {
        setCampaignModalOpen(false);
        setPendingSave(null);
        setSaveProgressLabel(null);
        setCampaignSaveError(null);
        router.push(
          `/campaigns/${finalCampaignId}?saved=${totalSaved}&target=${targetCount}&partial=1`,
        );
        return;
      }

      setCampaignSaveError(handleApiError(err));
      setSaveProgressLabel(null);
    } finally {
      setSavingCampaign(false);
    }
  }

  const showPreview = hasResults || search.loading || aiParsing;
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
    <div className="relative flex h-full min-h-0 overflow-hidden bg-slate-50/50">
      {mobileFiltersOpen && (
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => setMobileFiltersOpen(false)}
          className="fixed inset-0 z-[60] bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
        />
      )}
      <aside
        className={`h-full shrink-0 flex-col bg-white transition-all ${
          mobileFiltersOpen
            ? "fixed inset-y-0 left-0 z-[70] flex w-[min(22rem,calc(100vw-1rem))] shadow-2xl"
            : "hidden"
        } ${
          sidebarCollapsed
            ? "lg:static lg:z-auto lg:flex lg:w-12 lg:shadow-none"
            : "lg:static lg:z-auto lg:flex lg:w-full lg:max-w-[20rem] lg:shadow-none"
        }`}
      >
        <FilterPanel
          loading={search.loading}
          onSearch={(filters) => {
            setMobileFiltersOpen(false);
            return runSearch(filters);
          }}
          onBack={openLandingView}
          appliedFilters={appliedFilters}
          searchedFilters={search.filters}
          aiQuery={aiQuery}
          onAISearch={handleAISearch}
          onClearFilters={handleClearFilters}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => {
            if (window.innerWidth < 1024) {
              setMobileFiltersOpen(false);
              return;
            }
            setSidebarCollapsed((current) => !current);
          }}
          aiAdjusting={aiParsing}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => {
              setSidebarCollapsed(false);
              setMobileFiltersOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                d="M3 5h14M5.5 10h9M8 15h4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Filters
          </button>
          <span className="text-xs text-slate-500">
            Open to refine results
          </span>
        </div>
        <AISearchBar
          value={aiInput}
          onChange={setAiInput}
          onSearch={handleAISearch}
          loading={aiParsing || search.loading}
          loadingMessage={
            aiParsing ? "Our AI is building your filters…" : undefined
          }
          error={showEmpty ? search.error : null}
          warning={aiWarning}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {aiParsing ? (
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
        savingLabel={saveProgressLabel}
        error={campaignSaveError}
        onClose={() => {
          if (savingCampaign) return;
          setCampaignModalOpen(false);
          setCampaignSaveError(null);
          setSaveProgressLabel(null);
        }}
        onPrevious={handleCampaignPrevious}
        onSave={handleCampaignSave}
      />
    </div>
  );
}
