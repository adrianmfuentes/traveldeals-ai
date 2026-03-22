import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const intlMiddleware = createMiddleware(routing);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let API routes pass through
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Extract locale prefix and the path without it
  const localeMatch = pathname.match(/^\/(en|es|fr)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
  const cleanPath = localeMatch
    ? pathname.slice(localeMatch[0].length - (localeMatch[2] ? 0 : 0)).replace(/^\//, "/") || "/"
    : pathname;

  // Normalise: strip the locale prefix to get the clean path
  const pathWithoutLocale = localeMatch
    ? pathname.replace(/^\/(en|es|fr)/, "") || "/"
    : pathname;

  // Protect dashboard
  if (pathWithoutLocale.startsWith("/dashboard")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathWithoutLocale === "/login" || pathWithoutLocale === "/register") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)" ],
};
