"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Trash2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

interface UserMenuProps {
  name: string;
  email: string;
}

export default function UserMenu({ name, email }: UserMenuProps) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = "user-menu";

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmDelete(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      }
    } finally {
      setDeleting(false);
    }
  }

  const displayName = name || email;
  const initial = displayName[0]?.toUpperCase() ?? "U";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="flex items-center gap-2 ml-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div
          className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold"
          aria-hidden="true"
        >
          {initial}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={12}
          className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        <span className="sr-only">{t("accountMenu")}</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("accountMenu")}
          className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
        >
          {/* User info header */}
          <div
            className="px-4 py-3 border-b border-slate-100 dark:border-slate-800"
            role="presentation"
          >
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {name || email}
            </p>
            {name && (
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {email}
              </p>
            )}
          </div>

          {/* Sign out */}
          <button
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800"
          >
            <LogOut size={13} className="shrink-0" aria-hidden="true" />
            {t("signOut")}
          </button>

          {/* Delete account */}
          {!confirmDelete ? (
            <button
              role="menuitem"
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors border-t border-slate-100 dark:border-slate-800 focus-visible:outline-none focus-visible:bg-red-50 dark:focus-visible:bg-red-950/50"
            >
              <Trash2 size={13} className="shrink-0" aria-hidden="true" />
              {t("deleteAccount")}
            </button>
          ) : (
            <div
              role="group"
              aria-label={t("deleteAccountConfirm")}
              className="px-4 py-3 border-t border-slate-100 dark:border-slate-800"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {t("deleteAccountConfirm")}
              </p>
              <div className="flex gap-2">
                <button
                  role="menuitem"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {t("cancel")}
                </button>
                <button
                  role="menuitem"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {deleting ? t("deleting") : t("deleteAccountAction")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
