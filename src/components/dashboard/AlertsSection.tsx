"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import AlertCard from "./AlertCard";
import AlertForm from "./AlertForm";
import { useTranslations } from "next-intl";

interface SearchAlert {
  id: string;
  origin: string;
  destinations: string[];
  passengers: number;
  dateFrom: string;
  dateTo: string;
  frequencyMinutes: number;
  isActive: boolean;
  currency: string;
  maxBudget?: number | null;
  _count: { deals: number };
}

export default function AlertsSection() {
  const t = useTranslations("alerts");
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function fetchAlerts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Error al cargar alertas");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t("title")}
          {!loading && (
            <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">
              ({alerts.length})
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          {t("new")}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-xl p-4">
          {error}
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div
          onClick={() => setShowForm(true)}
          className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors group"
        >
          <Plus
            size={24}
            className="mx-auto text-slate-300 dark:text-slate-600 group-hover:text-blue-400 mb-2"
          />
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {t("empty.title")}
          </p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
            {t("empty.subtitle")}
          </p>
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onUpdate={fetchAlerts} />
          ))}
        </div>
      )}

      {showForm && (
        <AlertForm
          onSuccess={() => {
            setShowForm(false);
            fetchAlerts();
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
