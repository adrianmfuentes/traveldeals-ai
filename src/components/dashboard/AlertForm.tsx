"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

interface AlertFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AlertForm({ onSuccess, onClose }: AlertFormProps) {
  const t = useTranslations("alerts.form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [origin, setOrigin] = useState("");
  const [destinations, setDestinations] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tripDurationMin, setTripDurationMin] = useState<number | "">("");
  const [tripDurationMax, setTripDurationMax] = useState<number | "">("");
  const [maxBudget, setMaxBudget] = useState<number | "">("");
  const [currency, setCurrency] = useState("EUR");
  const [frequencyMinutes, setFrequencyMinutes] = useState(720);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const destinationsArray = destinations
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length >= 2);

      const body: Record<string, unknown> = {
        origin: origin.trim(),
        destinations: destinationsArray,
        passengers,
        dateFrom: new Date(dateFrom).toISOString(),
        dateTo: new Date(dateTo).toISOString(),
        currency,
        frequencyMinutes,
      };

      if (tripDurationMin !== "") body.tripDurationMin = tripDurationMin;
      if (tripDurationMax !== "") body.tripDurationMax = tripDurationMax;
      if (maxBudget !== "") body.maxBudget = maxBudget;

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("error"));
        return;
      }

      onSuccess();
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const labelClass =
    "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-transparent dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("origin")}</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                placeholder={t("originPlaceholder")}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("destinations")}</label>
              <input
                type="text"
                value={destinations}
                onChange={(e) => setDestinations(e.target.value)}
                placeholder={t("destinationsPlaceholder")}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("passengers")}</label>
            <input
              type="number"
              value={passengers}
              onChange={(e) => setPassengers(parseInt(e.target.value))}
              min={1}
              max={10}
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("dateFrom")}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("dateTo")}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("durationMin")}</label>
              <input
                type="number"
                value={tripDurationMin}
                onChange={(e) =>
                  setTripDurationMin(e.target.value ? parseInt(e.target.value) : "")
                }
                min={1}
                placeholder="3"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("durationMax")}</label>
              <input
                type="number"
                value={tripDurationMax}
                onChange={(e) =>
                  setTripDurationMax(e.target.value ? parseInt(e.target.value) : "")
                }
                min={1}
                placeholder="10"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("budget")}</label>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) =>
                  setMaxBudget(e.target.value ? parseFloat(e.target.value) : "")
                }
                min={0}
                placeholder="1500"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("currency")}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputClass}
              >
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("frequency")}</label>
            <select
              value={frequencyMinutes}
              onChange={(e) => setFrequencyMinutes(parseInt(e.target.value))}
              className={inputClass}
            >
              <option value={60}>{t("freq60")}</option>
              <option value={360}>{t("freq360")}</option>
              <option value={720}>{t("freq720")}</option>
              <option value={1440}>{t("freq1440")}</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t("creating") : t("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
