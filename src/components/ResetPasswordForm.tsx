"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setError(t("tooManyAttempts"));
        return;
      }
      if (!res.ok) {
        setError(data.error ?? t("invalidData"));
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError(t("connectionError"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-transparent dark:border-slate-800 text-center">
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{t("invalidToken")}</p>
        <Link href="/forgot-password" className="text-blue-600 hover:underline font-medium text-sm">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-transparent dark:border-slate-800">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("title")}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
          {t("subtitle")}
        </p>
      </div>

      {done ? (
        <div
          role="status"
          className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg px-3 py-3 text-center"
        >
          {t("success")}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              htmlFor="password"
            >
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
              placeholder={t("passwordHint")}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-3 py-2"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>
      )}
    </div>
  );
}
