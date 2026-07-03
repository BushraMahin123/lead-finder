import type { SearchFilters } from "@/types/lead";

const STORAGE_KEY = "lead-finder.saved-search";

export interface SavedSearchSession {
  filters: SearchFilters;
  aiQuery: string | null;
  totalEntries: number;
  contactCount: number;
  enrichEmail: boolean;
  enrichPhone: boolean;
  savedAt: string;
}

export function saveSearchSession(session: Omit<SavedSearchSession, "savedAt">) {
  const payload: SavedSearchSession = {
    ...session,
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadSearchSession(): SavedSearchSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedSearchSession>;
    if (!parsed.filters || typeof parsed.totalEntries !== "number") {
      return null;
    }

    const totalEntries = parsed.totalEntries;
    const fallbackCount = Math.min(50, totalEntries);

    return {
      filters: parsed.filters,
      aiQuery: parsed.aiQuery ?? null,
      totalEntries,
      contactCount: parsed.contactCount ?? fallbackCount,
      enrichEmail: parsed.enrichEmail ?? false,
      enrichPhone: parsed.enrichPhone ?? false,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearSearchSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
