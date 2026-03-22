"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default function DashboardNav() {
  return (
    <nav className="hidden md:flex items-center gap-1">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700"
      >
        <LayoutDashboard size={14} />
        Panel
      </Link>
    </nav>
  );
}
