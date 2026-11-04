import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresh cookies here; every protected page/API still authorizes at data access.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, cacheHeaders) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cacheHeaders ?? {}).forEach(([name, value]) => response.headers.set(name, value));
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}
export const config = { matcher: ["/api/backend/:path*","/api/ai", "/api/chat", "/api/viola", "/tech/studio/:path*", "/api/studio/:path*","/admin/:path*", "/api/admin/:path*", "/pamoja/manage/:path*", "/pamoja/login", "/api/pamoja/:path*", "/pamoja/account/:path*", "/pamoja/moments/:path*"] };

