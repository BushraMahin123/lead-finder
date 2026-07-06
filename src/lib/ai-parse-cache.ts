import { createHash } from "crypto";
import { AI_PARSE_CONFIG } from "@/lib/ai-parse-config";
import type { AiParseSource } from "@/lib/ai-parse-config";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { SearchFilters } from "@/types/lead";

const TABLE = "ai_parse_cache";

export interface CachedAiParse {
  filters: Partial<SearchFilters>;
  source: Exclude<AiParseSource, "cache">;
  createdAt: string;
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export function aiParseCacheKey(query: string): string {
  return createHash("sha256").update(normalizeQuery(query)).digest("hex");
}

interface CacheRow {
  filters: Partial<SearchFilters>;
  source: Exclude<AiParseSource, "cache">;
  created_at: string;
  expires_at: string;
}

export async function deleteCachedAiParse(query: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("cache_key", aiParseCacheKey(query));

  if (error) {
    console.error("[ai-parse-cache] delete failed:", error.message);
  }
}

export async function getCachedAiParse(
  query: string,
): Promise<CachedAiParse | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const key = aiParseCacheKey(query);

  const { data, error } = await supabase
    .from(TABLE)
    .select("filters, source, created_at, expires_at")
    .eq("cache_key", key)
    .maybeSingle();

  if (error) {
    console.error("[ai-parse-cache] read failed:", error.message);
    return null;
  }

  if (!data) return null;

  const row = data as CacheRow;

  if (Date.now() > new Date(row.expires_at).getTime()) {
    await supabase.from(TABLE).delete().eq("cache_key", key);
    return null;
  }

  return {
    filters: row.filters,
    source: row.source,
    createdAt: row.created_at,
  };
}

export async function setCachedAiParse(
  query: string,
  filters: Partial<SearchFilters>,
  source: Exclude<AiParseSource, "cache">,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + AI_PARSE_CONFIG.cacheTtlMs);
  const key = aiParseCacheKey(query);

  const { error } = await supabase.from(TABLE).upsert(
    {
      cache_key: key,
      query: query.trim(),
      filters,
      source,
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "cache_key" },
  );

  if (error) {
    console.error("[ai-parse-cache] write failed:", error.message);
  }
}
