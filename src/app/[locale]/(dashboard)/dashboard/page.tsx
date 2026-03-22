import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import AlertsSection from "@/components/dashboard/AlertsSection";
import DealsSection from "@/components/dashboard/DealsSection";
import { Bell, TrendingDown, Plane, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const t = await getTranslations("dashboard");

  const userId = (session.user as { id: string }).id;

  const [alertCount, dealCount, bestScoreDeal, cheapestDeal] = await Promise.all([
    prisma.searchAlert.count({ where: { userId, isActive: true } }),
    prisma.deal.count({ where: { userId, status: "READY" } }),
    prisma.deal.findFirst({
      where: { userId, status: "READY", aiScore: { not: null } },
      orderBy: { aiScore: "desc" },
      select: { origin: true, destination: true, aiScore: true },
    }),
    prisma.deal.findFirst({
      where: { userId, status: "READY" },
      orderBy: { flightPrice: "asc" },
      select: { origin: true, destination: true, flightPrice: true, currency: true },
    }),
  ]);

  const firstName = session.user.name ? `, ${session.user.name.split(" ")[0]}` : "";

  const stats = [
    {
      label: t("stats.activeAlerts"),
      value: alertCount,
      icon: <Bell size={18} className="text-blue-600" />,
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: t("stats.dealsFound"),
      value: dealCount,
      icon: <TrendingDown size={18} className="text-emerald-600" />,
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: t("stats.bestScore"),
      value: bestScoreDeal ? `${bestScoreDeal.aiScore}/100` : "—",
      icon: <Star size={18} className="text-amber-500" />,
      bg: "bg-amber-50 dark:bg-amber-950",
      sub: bestScoreDeal
        ? `${bestScoreDeal.origin} → ${bestScoreDeal.destination}`
        : undefined,
    },
    {
      label: t("stats.lowestPrice"),
      value: cheapestDeal
        ? `${Number(cheapestDeal.flightPrice).toLocaleString()} ${cheapestDeal.currency}`
        : "—",
      icon: <Plane size={18} className="text-violet-600" />,
      bg: "bg-violet-50 dark:bg-violet-950",
      sub: cheapestDeal
        ? `${cheapestDeal.origin} → ${cheapestDeal.destination}`
        : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("welcome", { name: firstName })}
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
          {t("subtitle")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm"
          >
            <div
              className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}
            >
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {s.value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {s.label}
            </div>
            {s.sub && (
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {s.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside id="alerts">
          <AlertsSection />
        </aside>
        <section>
          <DealsSection />
        </section>
      </div>
    </div>
  );
}
