import { type NextRequest } from "next/server";
import { absoluteAppUrl, getAppUrl, isLocalhostOrigin } from "@/lib/app-url";

function getForwardedOrigin(request: NextRequest | Request): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (!forwardedHost) return null;

  const host = forwardedHost.split(",")[0]?.trim();
  if (!host) return null;

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";

  return `${proto}://${host}`;
}

function getHostHeaderOrigin(request: NextRequest | Request): string | null {
  const host = request.headers.get("host");
  if (!host) return null;

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (process.env.NODE_ENV === "production" ? "https" : "http");

  return `${proto}://${host.split(",")[0]?.trim()}`;
}

export function getRequestOrigin(request: NextRequest | Request): string {
  const forwarded = getForwardedOrigin(request);
  if (forwarded && !isLocalhostOrigin(forwarded)) {
    return forwarded;
  }

  const hostHeader = getHostHeaderOrigin(request);
  if (hostHeader && !isLocalhostOrigin(hostHeader)) {
    return hostHeader;
  }

  const configured = getAppUrl();
  if (process.env.NODE_ENV === "production" && !isLocalhostOrigin(configured)) {
    return configured;
  }

  if ("nextUrl" in request) {
    const nextOrigin = request.nextUrl.origin;
    if (!isLocalhostOrigin(nextOrigin)) {
      return nextOrigin;
    }
  }

  if (forwarded) return forwarded;
  if (hostHeader) return hostHeader;

  return configured;
}

export function redirectToPath(
  request: NextRequest,
  pathname: string,
  search = "",
) {
  const url = new URL(pathname, getRequestOrigin(request));
  url.search = search;
  return url;
}

export function redirectToAppPath(pathname: string, search = "") {
  const url = new URL(pathname, getAppUrl());
  url.search = search;
  return url;
}

export { absoluteAppUrl };
