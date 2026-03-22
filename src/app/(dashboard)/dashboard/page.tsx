import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
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

  const stats = [
    {
      label: "Alertas activas",
      value: alertCount,
      icon: <Bell size={18} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      label: "Ofertas encontradas",
      value: dealCount,
      icon: <TrendingDown size={18} className="text-emerald-600" />,
      bg: "bg-emerald-50",
    },
    {
      label: "Mejor puntuación",
      value: bestScoreDeal ? `${bestScoreDeal.aiScore}/100` : "—",
      icon: <Star size={18} className="text-amber-500" />,
      bg: "bg-amber-50",
      sub: bestScoreDeal ? `${bestScoreDeal.origin} → ${bestScoreDeal.destination}` : undefined,
    },
    {
      label: "Precio más bajo",
      value: cheapestDeal
        ? `${Number(cheapestDeal.flightPrice).toLocaleString()} ${cheapestDeal.currency}`
        : "—",
      icon: <Plane size={18} className="text-violet-600" />,
      bg: "bg-violet-50",
      sub: cheapestDeal ? `${cheapestDeal.origin} → ${cheapestDeal.destination}` : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Bienvenido{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Gestiona tus alertas de viaje y consulta las mejores ofertas detectadas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            {s.sub && <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>}
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
