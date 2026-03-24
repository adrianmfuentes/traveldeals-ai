"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
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

type SearchStatus = "searching" | "no_flights" | "error" | "timeout";
type SearchState = { alertId: string; status: SearchStatus };

const SS_KEY = "searchState";

export default function AlertsSection() {
  const t = useTranslations("alerts");
  const tf = useTranslations("alerts.form");
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchState, setSearchState] = useState<SearchState | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // Restore state across remounts (theme / language changes)
  useEffect(() => {
    const saved = sessionStorage.getItem(SS_KEY);
    if (saved) {
      try {
        setSearchState(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem(SS_KEY);
      }
    }
  }, []);

  function saveState(state: SearchState | null) {
    if (state) sessionStorage.setItem(SS_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(SS_KEY);
    setSearchState(state);
  }

  function dismissBanner() {
    saveState(null);
  }

  async function fetchAlerts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error();
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

  // Poll the job result only while status === "searching"
  useEffect(() => {
    if (searchState?.status !== "searching") return;

    const alertId = searchState.alertId;
    pollCountRef.current = 0;

    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      try {
        const res = await fetch(`/api/alerts/${alertId}/status`);
        if (res.ok) {
          const data = await res.json();

          if (data.status === "done") {
            clearInterval(pollRef.current!);
            saveState(null);
            window.dispatchEvent(new Event("deals:refresh"));
            return;
          }

          if (data.status === "no_flights") {
            clearInterval(pollRef.current!);
            saveState({ alertId, status: "no_flights" });
            return;
          }

          if (data.status === "error") {
            clearInterval(pollRef.current!);
            saveState({ alertId, status: "error" });
            return;
          }
        }
      } catch {
        // ignore transient polling errors
      }

      if (pollCountRef.current >= 38) {
        clearInterval(pollRef.current!);
        saveState({ alertId, status: "timeout" });
      }
    }, 8_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [searchState?.alertId, searchState?.status]);

  function handleAlertCreated(alertId: string) {
    setShowForm(false);
    fetchAlerts();
    saveState({ alertId, status: "searching" });
  }

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

      {/* Searching banner */}
      {searchState?.status === "searching" && (
        <div className="mb-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <Loader2 size={16} className="text-blue-500 animate-spin mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {tf("searching")}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              {tf("searchingHint")}
            </p>
          </div>
        </div>
      )}

      {/* No flights found banner */}
      {searchState?.status === "no_flights" && (
        <div className="mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {tf("noFlights")}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {tf("noFlightsHint")}
            </p>
          </div>
          <button
            onClick={dismissBanner}
            className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 shrink-0"
            aria-label={tf("dismiss")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Search error banner */}
      {(searchState?.status === "error" || searchState?.status === "timeout") && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {searchState.status === "timeout" ? tf("searchTimeout") : tf("searchError")}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {searchState.status === "timeout" ? tf("searchTimeoutHint") : tf("searchErrorHint")}
            </p>
          </div>
          <button
            onClick={dismissBanner}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0"
            aria-label={tf("dismiss")}
          >
            <X size={15} />
          </button>
        </div>
      )}

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
          onSuccess={handleAlertCreated}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
