export type AiParseSource = "cache" | "rules" | "gemini" | "fallback";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const AI_PARSE_CONFIG = {
  /** Max AI search requests per user per hour (all sources). */
  rateLimitPerHour: readPositiveInt("AI_PARSE_RATE_LIMIT_PER_HOUR", 60),
  /** Max Gemini API calls per user per hour. */
  geminiRateLimitPerHour: readPositiveInt("AI_PARSE_GEMINI_RATE_LIMIT_PER_HOUR", 20),
  /** How long parsed queries stay cached. */
  cacheTtlMs: readPositiveInt("AI_PARSE_CACHE_TTL_DAYS", 30) * DAY_MS,
  /** Skip Gemini after quota errors for this long. */
  circuitBreakerCooldownMs:
    readPositiveInt("GEMINI_CIRCUIT_BREAKER_MINUTES", 15) * 60 * 1000,
} as const;

export const AI_PARSE_RATE_WINDOW_MS = HOUR_MS;
