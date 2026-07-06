function localPartFromEmail(email: string): string {
  return email.split("@")[0] ?? email;
}

export function displayNameFromEmail(email: string | null): string {
  if (!email) return "there";
  const local = localPartFromEmail(email);
  const segment = local.split(/[._-]/)[0] || local;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function greetingForTime(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
