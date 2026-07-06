import { AI_PARSE_CONFIG, AI_PARSE_RATE_WINDOW_MS } from "@/lib/ai-parse-config";
import type { AiParseSource } from "@/lib/ai-parse-config";
import { aiParseCacheKey } from "@/lib/ai-parse-cache";
import { getSupabaseAdmin } from "@/lib/supabase";

const TABLE = "ai_parse_requests";

export class AiParseRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "AiParseRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function windowStartIso(): string {
  return new Date(Date.now() - AI_PARSE_RATE_WINDOW_MS).toISOString();
}

async function countRecentRequests(
  userId: string,
  geminiOnly: boolean,
): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  let query = supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStartIso());

  if (geminiOnly) {
    query = query.eq("source", "gemini");
  }

  const { count, error } = await query;

  if (error) {
    console.error("[ai-parse-rate-limit] count failed:", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function assertAiParseRateLimit(
  userId: string,
  options: { geminiBound: boolean },
): Promise<void> {
  const [totalCount, geminiCount] = await Promise.all([
    countRecentRequests(userId, false),
    options.geminiBound ? countRecentRequests(userId, true) : Promise.resolve(0),
  ]);

  if (totalCount >= AI_PARSE_CONFIG.rateLimitPerHour) {
    throw new AiParseRateLimitError(
      `AI search limit reached (${AI_PARSE_CONFIG.rateLimitPerHour}/hour). Try again shortly or use manual filters.`,
      60,
    );
  }

  if (
    options.geminiBound &&
    geminiCount >= AI_PARSE_CONFIG.geminiRateLimitPerHour
  ) {
    throw new AiParseRateLimitError(
      `AI parsing limit reached (${AI_PARSE_CONFIG.geminiRateLimitPerHour} Gemini calls/hour). Basic filters still work — try a simpler query or manual filters.`,
      60,
    );
  }
}

export async function recordAiParseRequest(
  userId: string,
  query: string,
  source: AiParseSource,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error: insertError } = await supabase.from(TABLE).insert({
    user_id: userId,
    query_hash: aiParseCacheKey(query),
    source,
  });

  if (insertError) {
    console.error("[ai-parse-rate-limit] insert failed:", insertError.message);
    return;
  }

  const purgeBefore = new Date(
    Date.now() - AI_PARSE_RATE_WINDOW_MS * 2,
  ).toISOString();

  const { error: purgeError } = await supabase
    .from(TABLE)
    .delete()
    .lt("created_at", purgeBefore);

  if (purgeError) {
    console.error("[ai-parse-rate-limit] purge failed:", purgeError.message);
  }
}
