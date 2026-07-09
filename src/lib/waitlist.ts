export const WAITLIST_BYPASS_COOKIE = "lf_waitlist_bypass";

export function isWaitlistMode(): boolean {
  const value = process.env.WAITLIST_MODE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function getWaitlistBypassSecret(): string | null {
  const secret = process.env.WAITLIST_BYPASS_SECRET?.trim();
  return secret || null;
}

export function isValidWaitlistBypassSecret(candidate: string | null): boolean {
  const secret = getWaitlistBypassSecret();
  if (!secret || !candidate) return false;
  return candidate === secret;
}
