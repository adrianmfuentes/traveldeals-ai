import { createMiddleware } from "@platform/core/i18n/middleware";
import { routing } from "@/i18n/routing";

export const { middleware } = createMiddleware({ routing });

// Next.js statically analyzes this export — must be defined inline here,
// not imported or destructured from an external module.
export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)" ],
};
