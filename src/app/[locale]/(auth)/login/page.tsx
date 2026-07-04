"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";

export default function LoginPage() {
  const locale = useLocale();
  const t = useTranslations("auth.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
      } else {
        window.location.href = `/${locale}/dashboard`;
      }
    } catch {
      setError(t("email") + " / " + t("password").toLowerCase());
    } finally {
      setLoading(false);
    }
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            htmlFor="email"
          >
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              htmlFor="password"
            >
              {t("password")}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="••••••••"
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

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="text-blue-600 hover:underline font-medium"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
