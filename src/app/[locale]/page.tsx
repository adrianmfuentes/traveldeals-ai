import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Plane, ArrowRight, Check } from "lucide-react";
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
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Plane size={16} className="text-blue-500" />
          <span className="font-bold text-slate-900 dark:text-slate-100">TravelDeals</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 transition-colors"
          >
            {tn("login")}
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            {tn("register")}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">
            {t("badge")}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
            {t("headline1")}
            <br />
            <span className="text-blue-500">{t("headline2")}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-8 max-w-md">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              {t("ctaStart")}
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {t("ctaAccess")}
            </Link>
          </div>
        </div>

        {/* Sample deal card */}
        <div className="mt-12 lg:mt-0">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold mb-3">
            {t("sampleLabel")}
          </p>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plane size={14} className="text-blue-500" />
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {t("sampleRoute")}
                </span>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t("samplePrice")}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t("sampleAirline")}
            </p>
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 rounded-lg px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                84
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {t("sampleScore")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-8">
          {t("how")}
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { n: "1", title: t("step1title"), desc: t("step1desc") },
            { n: "2", title: t("step2title"), desc: t("step2desc") },
            { n: "3", title: t("step3title"), desc: t("step3desc") },
          ].map((step) => (
            <div key={step.n} className="flex gap-4">
              <div className="w-7 h-7 rounded-full border-2 border-blue-500 text-blue-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step.n}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-sm">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-8">
          {[
            { title: t("features.alerts.title"), desc: t("features.alerts.desc") },
            { title: t("features.sources.title"), desc: t("features.sources.desc") },
            { title: t("features.ai.title"), desc: t("features.ai.desc") },
          ].map((f) => (
            <div key={f.title}>
              <Check size={16} className="text-blue-500 mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-sm">
                {f.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
