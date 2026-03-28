"use client";

import { Link } from "@/i18n/navigation";
import { LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DashboardNav() {
  const t = useTranslations("nav");

  return (
    <nav aria-label={t("panel")} className="hidden md:flex items-center gap-1">
      <Link
        href="/dashboard"
        aria-current="page"
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <LayoutDashboard size={14} aria-hidden="true" />
        {t("panel")}
      </Link>
    </nav>
  );
}
