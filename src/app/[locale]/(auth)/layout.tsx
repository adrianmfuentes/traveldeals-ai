import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Plane } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-4 transition-colors">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white dark:focus:bg-slate-900 focus:text-blue-600 focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-blue-500 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <header className="w-full max-w-md mx-auto pt-2 pb-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm transition-colors"
        >
          <ArrowLeft size={15} />
          {t("back")}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/" className="flex items-center gap-1.5" aria-label="TravelDeals AI — Home">
            <Plane size={15} className="text-blue-600" aria-hidden="true" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              TravelDeals AI
            </span>
          </Link>
        </div>
      </header>
      <main id="main-content" className="flex-1 flex items-center justify-center" tabIndex={-1}>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
