"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useLocale } from "next-intl";

interface SignOutButtonProps {
  label: string;
}

export default function SignOutButton({ label }: SignOutButtonProps) {
  const locale = useLocale();

  return (
    <button
      onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
    >
      <LogOut size={13} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
