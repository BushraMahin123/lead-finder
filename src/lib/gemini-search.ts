import { GoogleGenAI } from "@google/genai";
import { AI_PARSE_CONFIG } from "@/lib/ai-parse-config";
import type { AiParseSource } from "@/lib/ai-parse-config";
import { deleteCachedAiParse, getCachedAiParse, setCachedAiParse } from "@/lib/ai-parse-cache";
import {
  assertAiParseRateLimit,
  recordAiParseRequest,
} from "@/lib/ai-parse-rate-limit";
import { TOKEN_RATES } from "@/lib/billing/token-rates";
import {
  buildGeminiSystemPrompt,
  hasAnySearchFilters,
  normalizeGeminiFilters,
} from "@/lib/gemini-filter-schema";
import {
  closeGeminiCircuit,
  isGeminiCircuitOpen,
  openGeminiCircuit,
} from "@/lib/gemini-circuit-breaker";
import { refineFiltersFromQuery } from "@/lib/refine-ai-filters";
import {
  isRuleBasedParseSufficient,
  parseLeadQueryWithRules,
  ruleBasedFallback,
} from "@/lib/rule-based-parse";
import type { SearchFilters } from "@/types/lead";

const GEMINI_MODEL = "gemini-2.0-flash";

export type GeminiParseResult = {
  filters: Partial<SearchFilters>;
  source: AiParseSource;
  warning?: string;
  cached?: boolean;
  tokensDebited?: number;
};

export type ParseLeadQueryOptions = {
  userId?: string;
};

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "Gemini is not configured. Add GEMINI_API_KEY to your environment.",
    );
  }
  return key;
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Gemini returned an invalid filter response.");
    }
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  }
}

function buildFallbackWarning(
  query: string,
  filters: Partial<SearchFilters>,
  error: unknown,
): string | undefined {
  if (isRuleBasedParseSufficient(query, filters)) {
    return undefined;
  }

  if (isGeminiUnavailableError(error)) {
    return "AI is temporarily unavailable (Gemini quota exceeded). Basic filters were applied from your query instead.";
  }

  return "AI could not fully parse that query. Basic filters were applied — review filters on the left and adjust if needed.";
}

function isGeminiUnavailableError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return (
    text.includes("429") ||
    /RESOURCE_EXHAUSTED/i.test(text) ||
    /quota exceeded/i.test(text) ||
    /rate.?limit/i.test(text) ||
    /free_tier/i.test(text)
  );
}

async function callGemini(query: string): Promise<Partial<SearchFilters>> {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${buildGeminiSystemPrompt()}\n\nUser query:\n${query}`,
          },
        ],
      },
    ],
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const raw = extractJsonObject(text);
  let filters = normalizeGeminiFilters(raw);
  filters = refineFiltersFromQuery(query, filters);

  if (!hasAnySearchFilters(filters)) {
    throw new Error(
      "Could not map that description to search filters. Try adding a job title, location, industry, or company detail.",
    );
  }

  return filters;
}

async function maybeRecordUsage(
  userId: string | undefined,
  query: string,
  source: AiParseSource,
): Promise<void> {
  if (!userId || source === "cache") return;
  await recordAiParseRequest(userId, query, source);
}

export async function parseLeadQueryWithGemini(
  query: string,
  options: ParseLeadQueryOptions = {},
): Promise<GeminiParseResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Enter a description of the leads you want to find.");
  }

  const { userId } = options;

  const cached = await getCachedAiParse(trimmed);
  if (cached) {
    if (cached.source === "fallback") {
      const refreshed = parseLeadQueryWithRules(trimmed);
      if (isRuleBasedParseSufficient(trimmed, refreshed)) {
        await setCachedAiParse(trimmed, refreshed, "rules");
        return {
          filters: refreshed,
          source: "rules",
          tokensDebited: 0,
        };
      }

      await deleteCachedAiParse(trimmed);
    } else {
      return {
        filters: cached.filters,
        source: "cache",
        cached: true,
        tokensDebited: 0,
      };
    }
  }

  if (userId) {
    await assertAiParseRateLimit(userId, { geminiBound: false });
  }

  const ruleFilters = parseLeadQueryWithRules(trimmed);
  if (isRuleBasedParseSufficient(trimmed, ruleFilters)) {
    await setCachedAiParse(trimmed, ruleFilters, "rules");
    await maybeRecordUsage(userId, trimmed, "rules");

    return {
      filters: ruleFilters,
      source: "rules",
      tokensDebited: 0,
    };
  }

  if (userId) {
    await assertAiParseRateLimit(userId, { geminiBound: true });
  }

  if (await isGeminiCircuitOpen()) {
    const fallback = ruleBasedFallback(trimmed);
    if (fallback) {
      const sufficient = isRuleBasedParseSufficient(trimmed, fallback);
      const cacheSource = sufficient ? "rules" : "fallback";

      if (sufficient || cacheSource === "fallback") {
        await setCachedAiParse(trimmed, fallback, cacheSource);
      }
      await maybeRecordUsage(userId, trimmed, cacheSource);

      return {
        filters: fallback,
        source: sufficient ? "rules" : "fallback",
        warning: sufficient
          ? undefined
          : "AI is temporarily paused after recent quota limits. Basic filters were applied from your query.",
        tokensDebited: 0,
      };
    }

    throw new Error(
      "AI search is temporarily unavailable. Use manual filters or try again in a few minutes.",
    );
  }

  try {
    const filters = await callGemini(trimmed);
    await closeGeminiCircuit();
    await setCachedAiParse(trimmed, filters, "gemini");
    await maybeRecordUsage(userId, trimmed, "gemini");

    return {
      filters,
      source: "gemini",
      tokensDebited: TOKEN_RATES.aiParse,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gemini filter parsing failed";
    console.error("[gemini-search]", message);

    if (message.includes("not configured")) {
      throw error;
    }

    if (isGeminiUnavailableError(error)) {
      await openGeminiCircuit();
    }

    const fallback = ruleBasedFallback(trimmed);
    if (fallback) {
      const sufficient = isRuleBasedParseSufficient(trimmed, fallback);
      const cacheSource = sufficient ? "rules" : "fallback";

      if (sufficient || cacheSource === "fallback") {
        await setCachedAiParse(trimmed, fallback, cacheSource);
      }
      await maybeRecordUsage(userId, trimmed, cacheSource);

      const warning = buildFallbackWarning(trimmed, fallback, error);

      if (warning) {
        console.warn("[gemini-search] Falling back to rule-based parser.");
      }

      return {
        filters: fallback,
        source: sufficient ? "rules" : "fallback",
        warning,
        tokensDebited: 0,
      };
    }

    if (isGeminiUnavailableError(error)) {
      throw new Error(
        "AI search is temporarily unavailable because the Gemini API quota was exceeded. Use manual filters, or retry in a minute.",
      );
    }

    throw new Error(message);
  }
}
