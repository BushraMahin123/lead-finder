import { GoogleGenAI } from "@google/genai";
import { parseLeadQuery } from "@/lib/parse-lead-query";
import {
  buildGeminiSystemPrompt,
  hasAnySearchFilters,
  normalizeGeminiFilters,
} from "@/lib/gemini-filter-schema";
import { refineFiltersFromQuery } from "@/lib/refine-ai-filters";
import type { SearchFilters } from "@/types/lead";

const GEMINI_MODEL = "gemini-2.0-flash";

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

export async function parseLeadQueryWithGemini(
  query: string,
): Promise<Partial<SearchFilters>> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Enter a description of the leads you want to find.");
  }

  try {
    return await callGemini(trimmed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gemini filter parsing failed";
    console.error("[gemini-search]", message);

    if (message.includes("not configured")) {
      throw error;
    }

    const fallback = refineFiltersFromQuery(trimmed, parseLeadQuery(trimmed));
    if (hasAnySearchFilters(fallback)) {
      console.warn("[gemini-search] Falling back to rule-based parser.");
      return fallback;
    }

    throw new Error(message);
  }
}
