import { getAppSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Plane } from "lucide-react";
import DashboardNav from "@/components/dashboard/DashboardNav";
import SignOutButton from "@/components/SignOutButton";
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

  const t = await getTranslations("nav");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Top nav */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2">
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
              <div className="hidden sm:flex items-center gap-2 ml-1">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold">
                  {(session.user.name ?? session.user.email ?? "U")[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {session.user.name ?? session.user.email}
                </span>
              </div>
              <SignOutButton label={t("signOut")} />
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
