import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasUserProfile } from "@/lib/signup/profile";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/login", "/signup", "/pricing"];
const ONBOARDING_PATH = "/onboarding";

function isPublicPath(pathname: string, searchParams: URLSearchParams): boolean {
  if (pathname === "/" && searchParams.get("view") === "search") {
    return false;
  }

  if (pathname === "/") {
    return true;
  }

  return (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    ) ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/webhooks/")
  );
}

function getUserId(claims: Record<string, unknown> | null | undefined): string | null {
  return typeof claims?.sub === "string" ? claims.sub : null;
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

    if (!isPublicPath(pathname, request.nextUrl.searchParams)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.redirect(new URL(next, request.url));
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "view=search";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
