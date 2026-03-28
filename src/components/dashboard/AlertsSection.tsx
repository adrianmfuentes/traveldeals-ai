"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
type SearchState = { alertId: string; status: SearchStatus; startedAt?: number };

const SS_KEY = "searchState";

export default function AlertsSection() {
  const t = useTranslations("alerts");
  const tf = useTranslations("alerts.form");
  const router = useRouter();
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<SearchAlert | null>(null);
  const [searchState, setSearchState] = useState<SearchState | null>(null);
  const [searchElapsed, setSearchElapsed] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  // Track whether we've done the first fetch so background refreshes skip the skeleton
  const initializedRef = useRef(false);

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

  const fetchAlerts = useCallback(async () => {
    // Only show skeleton on the very first load
    if (!initializedRef.current) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      initializedRef.current = true;
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Auto-refresh alert cards every 60s to pick up updated deal counts (no skeleton)
  useEffect(() => {
    const id = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  // When a search completes or an alert is deleted, refresh server-rendered stats
  useEffect(() => {
    function onDealsRefresh() {
      fetchAlerts();
      router.refresh();
    }
    function onAlertDeleted() {
      router.refresh();
    }
    window.addEventListener("deals:refresh", onDealsRefresh);
    window.addEventListener("alert:deleted", onAlertDeleted);
    return () => {
      window.removeEventListener("deals:refresh", onDealsRefresh);
      window.removeEventListener("alert:deleted", onAlertDeleted);
    };
  }, [fetchAlerts, router]);

  // Elapsed time counter while searching
  useEffect(() => {
    if (searchState?.status !== "searching") {
      setSearchElapsed(0);
      return;
    }
    // If the state was restored from sessionStorage, compute elapsed from startedAt
    const started = searchState.startedAt ?? Date.now();
    setSearchElapsed(Math.floor((Date.now() - started) / 1000));
    const id = setInterval(() => {
      setSearchElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [searchState?.status, searchState?.alertId, searchState?.startedAt]);

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

  function handleAlertCreated(alertId: string, enqueued: boolean) {
    const wasEditing = editingAlert !== null;
    setShowForm(false);
    setEditingAlert(null);
    fetchAlerts();
    if (enqueued) {
      if (wasEditing) {
        window.dispatchEvent(
          new CustomEvent("alert:edited", { detail: { alertId } })
        );
      }
      saveState({ alertId, status: "searching", startedAt: Date.now() });
    }
  }

  // Progress bar fills to 95% over 60s, then holds
  const progressPct = Math.min(95, (searchElapsed / 60) * 100);

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
        <div role="status" aria-live="polite" className="mb-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <Loader2 size={16} className="text-blue-500 animate-spin mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {tf("searching")}
              </p>
              <span className="text-xs tabular-nums text-blue-500 dark:text-blue-400 shrink-0">
                {searchElapsed}s
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
              {tf("searchingHint")}
            </p>
            <div className="h-1 bg-blue-100 dark:bg-blue-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* No flights found banner */}
      {searchState?.status === "no_flights" && (
        <div role="alert" aria-live="assertive" className="mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
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
        <div role="alert" aria-live="assertive" className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
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
            <AlertCard
              key={alert.id}
              alert={alert}
              onUpdate={fetchAlerts}
              onEdit={() => setEditingAlert(alert)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <AlertForm
          onSuccess={handleAlertCreated}
          onClose={() => setShowForm(false)}
        />
      )}

      {editingAlert && (
        <AlertForm
          initialData={editingAlert}
          onSuccess={handleAlertCreated}
          onClose={() => setEditingAlert(null)}
        />
      )}
    </div>
  );
}
