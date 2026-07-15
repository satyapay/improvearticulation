import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection: /drills requires a signed-in user; a signed-in
 * user visiting /auth is sent straight to /drills. Also refreshes
 * the Supabase session cookie on every matched request.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  // Not configured yet (placeholder env) — don't crash, just pass through.
  if (!url || !key || url.includes("YOUR-PROJECT")) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && path.startsWith("/drills")) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  if (user && path === "/auth") {
    return NextResponse.redirect(new URL("/drills", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/drills/:path*", "/auth"],
};
