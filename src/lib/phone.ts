/** Normalize a lead phone into E.164. Defaults to +1 for 10-digit US numbers. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed || /no phone/i.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return null;

  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}
