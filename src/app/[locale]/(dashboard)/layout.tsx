import { getAppSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Plane } from "lucide-react";
import DashboardNav from "@/components/dashboard/DashboardNav";
import UserMenu from "@/components/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white dark:focus:bg-slate-900 focus:text-blue-600 focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-blue-500 focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Top nav */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2" aria-label="TravelDeals AI — Home">
                <Plane size={16} className="text-blue-600" />
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  TravelDeals
                </span>
                <span className="text-base font-bold text-blue-600">AI</span>
              </Link>
              <DashboardNav />
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <UserMenu
                name={session.user.name ?? ""}
                email={session.user.email ?? ""}
              />
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
