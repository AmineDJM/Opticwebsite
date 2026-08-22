import { NextResponse, type NextRequest } from "next/server";

/**
 * Locale hint middleware. Reads a `locale` cookie (set by the language switcher) and
 * forwards it as a request header so server components can resolve it without touching
 * cookies in `cache()`d functions. Tenant resolution itself happens in the layout.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const locale = request.cookies.get("optic_locale")?.value;
  if (locale) requestHeaders.set("x-optic-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|media/).*)"],
};
