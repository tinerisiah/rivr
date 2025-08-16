import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const execSubdomain = process.env.NEXT_PUBLIC_EXEC_SUBDOMAIN || "exec";

  if (!host) {
    return NextResponse.next();
  }

  // Extract subdomain from host
  const getSubdomain = (host: string): string | null => {
    if (!baseDomain) {
      const parts = host.split(".");
      return parts.length > 1 ? parts[0] : null;
    }

    if (host.endsWith(`.${baseDomain}`)) {
      const withoutBase = host.slice(0, -`.${baseDomain}`.length);
      return withoutBase || null;
    }
    return null;
  };

  const subdomain = getSubdomain(host);

  // Handle RIVR Executive Portal
  if (subdomain === execSubdomain) {
    // Ensure we're on the exec route
    const res = request.nextUrl.pathname.startsWith("/rivr-exec")
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/rivr-exec", request.url));
    // Clear tenant cookie for exec portal
    res.cookies.delete("tenant_subdomain");
    return res;
  }

  // Handle business subdomains
  if (subdomain && subdomain !== "www" && subdomain !== "localhost") {
    // Validate subdomain format (alphanumeric and hyphens only)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      const res = NextResponse.redirect(new URL("/not-found", request.url));
      res.cookies.delete("tenant_subdomain");
      return res;
    }

    // Route business-specific paths
    const path = request.nextUrl.pathname;

    // Business admin routes
    if (path.startsWith("/business-admin") || path === "/business-admin") {
      const res = NextResponse.next();
      res.cookies.set("tenant_subdomain", subdomain, {
        path: "/",
        sameSite: "lax",
      });
      return res;
    }

    // Auth routes
    if (path.startsWith("/auth") || path === "/auth") {
      const res = NextResponse.next();
      res.cookies.set("tenant_subdomain", subdomain, {
        path: "/",
        sameSite: "lax",
      });
      return res;
    }

    // Driver routes
    if (path.startsWith("/driver") || path === "/driver") {
      const res = NextResponse.next();
      res.cookies.set("tenant_subdomain", subdomain, {
        path: "/",
        sameSite: "lax",
      });
      return res;
    }

    // Customer/pickup routes
    if (path.startsWith("/pickup") || path === "/pickup") {
      const res = NextResponse.next();
      res.cookies.set("tenant_subdomain", subdomain, {
        path: "/",
        sameSite: "lax",
      });
      return res;
    }

    // Default: set cookie and continue
    const res = NextResponse.next();
    res.cookies.set("tenant_subdomain", subdomain, {
      path: "/",
      sameSite: "lax",
    });
    return res;
  }

  // Handle root domain (no subdomain)
  if (!subdomain || subdomain === "www") {
    // Clear tenant cookie on root domain
    const res = NextResponse.next();
    res.cookies.delete("tenant_subdomain");
    return res;
  }

  const res = NextResponse.next();
  res.cookies.delete("tenant_subdomain");
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
