import { AI_PARSE_CONFIG } from "@/lib/ai-parse-config";
import { getSupabaseAdmin } from "@/lib/supabase";

const STATE_KEY = "gemini_circuit";

let memoryOpenUntil = 0;

interface CircuitState {
  openUntil: string;
}

async function readPersistedOpenUntil(): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from("ai_service_state")
    .select("value")
    .eq("key", STATE_KEY)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[gemini-circuit] read failed:", error.message);
    }
    return 0;
  }

  const value = data.value as CircuitState;
  const openUntil = Date.parse(value.openUntil);
  return Number.isFinite(openUntil) ? openUntil : 0;
}

async function persistOpenUntil(openUntil: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("ai_service_state").upsert(
    {
      key: STATE_KEY,
      value: { openUntil: new Date(openUntil).toISOString() } satisfies CircuitState,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    console.error("[gemini-circuit] write failed:", error.message);
  }
}

export function isGeminiCircuitOpenSync(): boolean {
  return Date.now() < memoryOpenUntil;
}

export async function isGeminiCircuitOpen(): Promise<boolean> {
  if (isGeminiCircuitOpenSync()) return true;

  const persisted = await readPersistedOpenUntil();
  if (persisted > Date.now()) {
    memoryOpenUntil = persisted;
    return true;
  }

  return false;
}

export async function openGeminiCircuit(
  cooldownMs = AI_PARSE_CONFIG.circuitBreakerCooldownMs,
): Promise<void> {
  const openUntil = Date.now() + cooldownMs;
  memoryOpenUntil = openUntil;
  await persistOpenUntil(openUntil);
  console.warn(
    `[gemini-circuit] Open until ${new Date(openUntil).toISOString()}`,
  );
}

export async function closeGeminiCircuit(): Promise<void> {
  memoryOpenUntil = 0;
  await persistOpenUntil(0);
}
