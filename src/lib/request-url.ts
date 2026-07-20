import { type NextRequest } from "next/server";

export function getRequestOrigin(request: NextRequest | Request): string {
  if ("nextUrl" in request) {
    return request.nextUrl.origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    if (host) {
      return `${proto}://${host}`;
    }
  }

  return new URL(request.url).origin;
}

export function redirectToPath(request: NextRequest, pathname: string, search = "") {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return url;
}
