import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AuthClaims = {
  sub?: string;
  email?: string;
  [key: string]: unknown;
};

export async function getAuthenticatedClaims(): Promise<AuthClaims | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const claims = await getAuthenticatedClaims();
  return typeof claims?.sub === "string" ? claims.sub : null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
