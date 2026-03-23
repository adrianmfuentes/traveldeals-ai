import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);
const locales = routing.locales as readonly string[];
const defaultLocale = routing.defaultLocale as string;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes pass through
  if (pathname.startsWith("/api")) return NextResponse.next();

  const localePattern = locales.join("|");
  const localeMatch = pathname.match(new RegExp(`^\\/(${localePattern})(\\/|$)`));
  const locale = localeMatch ? localeMatch[1] : defaultLocale;
  const pathWithoutLocale = localeMatch
    ? pathname.replace(new RegExp(`^\\/(${localePattern})`), "") || "/"
    : pathname;

  // Protect /dashboard
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

// Next.js statically analyzes this export — must be defined inline here,
// not imported or destructured from an external module.
export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)" ],
};
