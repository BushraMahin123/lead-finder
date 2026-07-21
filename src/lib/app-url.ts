function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\s+/g, "").trim();
  if (
    configured &&
    !(process.env.NODE_ENV === "production" && isLocalhostUrl(configured))
  ) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL?.replace(/\s+/g, "").trim()) {
    return `https://${process.env.VERCEL_URL.replace(/\s+/g, "").trim()}`;
  }

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export function absoluteAppUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAppUrl()}${normalized}`;
}

export function isLocalhostOrigin(origin: string): boolean {
  return isLocalhostUrl(origin);
}
