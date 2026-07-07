import { NextResponse } from "next/server";
import {
  getAuthenticatedClaims,
  getAuthenticatedUserId,
  type AuthClaims,
} from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

function parseSuperAdminUserIds(): Set<string> {
  const raw = process.env.SUPER_ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function hasSuperAdminClaim(claims: AuthClaims | null): boolean {
  const appMetadata = claims?.app_metadata;
  if (!appMetadata || typeof appMetadata !== "object") return false;
  return (appMetadata as Record<string, unknown>).role === "super_admin";
}

export async function isSuperAdmin(
  userId: string,
  claims?: AuthClaims | null,
): Promise<boolean> {
  if (parseSuperAdminUserIds().has(userId)) return true;
  if (claims && hasSuperAdminClaim(claims)) return true;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error } = await admin
    .from("user_profiles")
    .select("is_super_admin")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Column may not exist until super_admins migration is applied.
    if (!error.message.includes("is_super_admin")) {
      console.error("[admin] profile lookup failed:", error.message);
    }
    return false;
  }

  return Boolean(data?.is_super_admin);
}

export async function requireSuperAdmin(): Promise<
  | { ok: true; userId: string; claims: AuthClaims }
  | { ok: false; response: NextResponse }
> {
  const claims = await getAuthenticatedClaims();
  const userId = await getAuthenticatedUserId();

  if (!userId || !claims) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!(await isSuperAdmin(userId, claims))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId, claims };
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
