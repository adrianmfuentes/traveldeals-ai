"use client";

import { Link } from "@/i18n/navigation";
import { LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DashboardNav() {
  const t = useTranslations("nav");

  return (
    <nav className="hidden md:flex items-center gap-1">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
      >
        <LayoutDashboard size={14} />
        {t("panel")}
      </Link>
    </nav>
  );
}
