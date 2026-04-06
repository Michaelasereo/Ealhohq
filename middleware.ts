import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Session refresh uses @supabase/ssr (recommended for Next.js App Router).
 * `createMiddlewareClient` from @supabase/auth-helpers-nextjs is not available in v0.15.
 */

function isPublicPath(path: string): boolean {
  if (path === "/" || path.startsWith("/book")) return true;
  if (path.startsWith("/refer")) return true;
  if (path === "/organizations") return true;
  if (
    path === "/privacy" ||
    path === "/terms" ||
    path === "/therapist-standards"
  ) {
    return true;
  }
  if (path.startsWith("/rebook")) return true;
  if (path.startsWith("/session")) return true;
  if (path === "/login" || path === "/signup") return true;
  if (path === "/therapist/login") return true;
  if (path.startsWith("/verify")) return true;
  if (path.startsWith("/auth")) return true;
  if (path.startsWith("/therapist/enroll")) return true;
  if (path === "/admin/login") return true;
  if (path === "/test-session" || path.startsWith("/test-session/")) return true;
  return false;
}

function isAdminProtectedPath(path: string): boolean {
  if (path === "/admin" || path === "/admin/") return true;
  return path.startsWith("/admin/") && !path.startsWith("/admin/login");
}

function isProtectedPath(path: string): boolean {
  if (isPublicPath(path)) return false;
  if (isAdminProtectedPath(path)) return false;
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/sessions") ||
    path.startsWith("/history") ||
    path.startsWith("/profile") ||
    path.startsWith("/messages") ||
    path.startsWith("/therapist") ||
    path.startsWith("/partners")
  );
}

function isPatientAppPath(path: string): boolean {
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/sessions") ||
    path.startsWith("/history") ||
    path.startsWith("/profile") ||
    path.startsWith("/messages")
  );
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;
  const role = session?.user?.app_metadata?.role as string | undefined;
  const status = session?.user?.app_metadata?.status as string | undefined;

  if (session && path === "/login") {
    if (role === "patient") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (role === "therapist") {
      if (status === "approved") {
        return NextResponse.redirect(new URL("/therapist/dashboard", request.url));
      }
      if (status === "pending") {
        return NextResponse.redirect(new URL("/therapist/pending", request.url));
      }
      if (status === "rejected") {
        return supabaseResponse;
      }
      return NextResponse.redirect(new URL("/therapist/pending", request.url));
    }
    if (role === "partner") {
      return NextResponse.redirect(new URL("/partners/dashboard", request.url));
    }
  }

  if (session && path === "/therapist/login") {
    if (role === "patient") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (role === "therapist") {
      if (status === "approved") {
        return NextResponse.redirect(new URL("/therapist/dashboard", request.url));
      }
      if (status === "pending") {
        return NextResponse.redirect(new URL("/therapist/pending", request.url));
      }
      if (status === "rejected") {
        return supabaseResponse;
      }
      return NextResponse.redirect(new URL("/therapist/pending", request.url));
    }
  }

  if (session && path === "/signup") {
    if (role === "patient") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (role === "therapist") {
      if (status === "approved") {
        return NextResponse.redirect(new URL("/therapist/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/therapist/pending", request.url));
    }
  }

  if (session && path === "/admin/login") {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!session && isAdminProtectedPath(path)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (!session && isProtectedPath(path)) {
    if (path.startsWith("/partners")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (
      path.startsWith("/therapist") &&
      !path.startsWith("/therapist/enroll") &&
      path !== "/therapist/login"
    ) {
      return NextResponse.redirect(new URL("/therapist/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (role === "therapist" && status === "rejected" && path.startsWith("/therapist/dashboard")) {
    return NextResponse.redirect(new URL("/therapist/login", request.url));
  }

  if (role === "therapist" && status === "pending" && path.startsWith("/therapist/dashboard")) {
    return NextResponse.redirect(new URL("/therapist/pending", request.url));
  }

  if (
    role === "therapist" &&
    status === "approved" &&
    (path === "/therapist/pending" || path === "/therapist/pending/")
  ) {
    return NextResponse.redirect(new URL("/therapist/dashboard", request.url));
  }

  if (
    role === "patient" &&
    path.startsWith("/therapist") &&
    !path.startsWith("/therapist/enroll")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Admin routes: do not redirect by JWT role alone — `shared_profiles.role` may
  // be admin before app_metadata is refreshed. `/api/admin/*` and admin login gate access.

  if (role === "therapist" && isPatientAppPath(path)) {
    return NextResponse.redirect(new URL("/therapist/dashboard", request.url));
  }

  if (path.startsWith("/partners")) {
    if (role === "partner") return supabaseResponse;
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (role === "therapist") {
      return NextResponse.redirect(new URL("/therapist/dashboard", request.url));
    }
    if (role === "patient") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip auth/session work for public lead capture (and static assets).
    "/((?!_next/static|_next/image|favicon.ico|api/leads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
