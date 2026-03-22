import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Plane, Bell, Globe, TrendingDown, Sparkles, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations("landing");
  const tn = await getTranslations("nav");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Plane size={18} className="text-blue-400" />
          <span className="font-bold text-lg text-white">TravelDeals AI</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {tn("login")}
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {tn("register")}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center px-6 pt-20 pb-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full border border-blue-500/30 mb-6">
          <Sparkles size={12} />
          {t("badge")}
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6">
          {t("headline1")}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            {t("headline2")}
          </span>
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
          {t("description")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/30"
          >
            {t("ctaStart")}
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors border border-white/20"
          >
            {t("ctaAccess")}
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        {[
          {
            icon: <Bell size={20} />,
            title: t("features.alerts.title"),
            desc: t("features.alerts.desc"),
          },
          {
            icon: <Globe size={20} />,
            title: t("features.sources.title"),
            desc: t("features.sources.desc"),
          },
          {
            icon: <TrendingDown size={20} />,
            title: t("features.ai.title"),
            desc: t("features.ai.desc"),
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-4">
              {f.icon}
            </div>
            <h3 className="font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
