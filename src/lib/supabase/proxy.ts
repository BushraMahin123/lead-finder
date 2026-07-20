import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasUserProfile } from "@/lib/signup/profile";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import {
  WAITLIST_BYPASS_COOKIE,
  isValidWaitlistBypassSecret,
  isWaitlistMode,
} from "@/lib/waitlist";

const PUBLIC_PATHS = ["/login", "/signup", "/pricing"];
const ONBOARDING_PATH = "/onboarding";
const WAITLIST_PUBLIC_API = "/api/waitlist";

function hasWaitlistBypass(request: NextRequest): boolean {
  if (!isWaitlistMode()) return true;
  return request.cookies.get(WAITLIST_BYPASS_COOKIE)?.value === "1";
}

function isPublicPath(
  pathname: string,
  searchParams: URLSearchParams,
  bypassActive: boolean,
): boolean {
  if (pathname === WAITLIST_PUBLIC_API) {
    return true;
  }

  if (pathname === "/" && searchParams.get("view") === "search") {
    return false;
  }

  if (pathname === "/") {
    return true;
  }

  // Auth callbacks must stay reachable so OAuth/email confirm can complete
  // after a developer signs in with a bypass cookie.
  if (pathname.startsWith("/auth/") || pathname.startsWith("/api/webhooks/")) {
    return true;
  }

  // During waitlist mode, keep signup closed but allow login so invited
  // accounts can sign in without the developer bypass cookie.
  if (isWaitlistMode() && !bypassActive) {
    return pathname === "/login" || pathname.startsWith("/login/");
  }

  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function getUserId(claims: Record<string, unknown> | null | undefined): string | null {
  return typeof claims?.sub === "string" ? claims.sub : null;
}

function applyBypassCookie(response: NextResponse): NextResponse {
  response.cookies.set(WAITLIST_BYPASS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Developer unlock: /?access=<WAITLIST_BYPASS_SECRET>
  const accessParam = request.nextUrl.searchParams.get("access");
  if (
    isWaitlistMode() &&
    accessParam &&
    isValidWaitlistBypassSecret(accessParam)
  ) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("access");
    const redirect = NextResponse.redirect(url);
    return applyBypassCookie(redirect);
  }

  const bypassActive = hasWaitlistBypass(request);

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const userId = getUserId(user);
  const { pathname } = request.nextUrl;

  if (!user) {
    if (pathname === ONBOARDING_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", ONBOARDING_PATH);
      return NextResponse.redirect(url);
    }

    if (!isPublicPath(pathname, request.nextUrl.searchParams, bypassActive)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // During waitlist mode without bypass, send guests back to the landing page
      // instead of exposing login/signup.
      if (isWaitlistMode() && !bypassActive) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }

      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const profileComplete = userId ? await hasUserProfile(userId) : false;

  if (!profileComplete) {
    if (pathname !== ONBOARDING_PATH) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Complete your workspace setup to continue." },
          { status: 403 },
        );
      }

      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  if (pathname === ONBOARDING_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "view=search";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" || pathname === "/signup") {
    const next = request.nextUrl.searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "view=search";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const { isSuperAdminFromSession } = await import("@/lib/admin");
    const allowed = userId ? isSuperAdminFromSession(userId, user) : false;

    if (!allowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "view=search";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
