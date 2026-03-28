"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import DealCard from "./DealCard";
import DealDetail from "./DealDetail";
import { useTranslations } from "next-intl";

interface Deal {
  id: string;
  alertId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  airline?: string | null;
  flightPrice: number;
  currency: string;
  totalEstimate?: number | null;
  aiScore?: number | null;
  aiSummary?: string | null;
  aiBudget?: unknown | null;
  aiItinerary?: unknown | null;
  aiRawResponse?: unknown | null;
  bookingUrl?: string | null;
  hotelName?: string | null;
  hotelPrice?: number | null;
  hotelBookingUrl?: string | null;
}

const PAGE_SIZE = 4;

interface DealsSectionProps {
  alertId?: string;
}

export default function DealsSection({ alertId }: DealsSectionProps) {
  const t = useTranslations("deals");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Keep a stable ref to current deals length for "load more" and refresh detection
  const dealsLengthRef = useRef(0);
  dealsLengthRef.current = deals.length;

  function buildUrl(offset: number) {
    const params = new URLSearchParams({ status: "READY", offset: String(offset) });
    if (alertId) params.set("alertId", alertId);
    return `/api/deals?${params}`;
  }

  const fetchDeals = useCallback(async (reset = true) => {
    if (reset) {
      setError("");
      // Only show skeleton when there are no deals to display yet
      if (dealsLengthRef.current === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
    } else {
      setLoadingMore(true);
    }
    try {
      const offset = reset ? 0 : dealsLengthRef.current;
      const res = await fetch(buildUrl(offset));
      if (!res.ok) throw new Error();
      const data = await res.json();
      const incoming: Deal[] = data.deals ?? [];
      setTotal(data.total ?? 0);
      setDeals((prev) => (reset ? incoming : [...prev, ...incoming]));
    } catch {
      if (reset) setError(t("loadError"));
    } finally {
      if (reset) {
        setLoading(false);
        setRefreshing(false);
      } else {
        setLoadingMore(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  useEffect(() => {
    fetchDeals(true);
  }, [fetchDeals]);

  useEffect(() => {
    function onRefresh() { fetchDeals(true); }

    function removeAlertDeals(targetAlertId: string) {
      setDeals((prev) => {
        const next = prev.filter((d) => d.alertId !== targetAlertId);
        const removed = prev.length - next.length;
        if (removed > 0) {
          setTotal((t) => Math.max(0, t - removed));
        }
        return next;
      });
    }

    function onAlertDeleted(e: Event) {
      const { alertId: deletedId } = (e as CustomEvent<{ alertId: string }>).detail;
      removeAlertDeals(deletedId);
    }

    function onAlertEdited(e: Event) {
      const { alertId: editedId } = (e as CustomEvent<{ alertId: string }>).detail;
      removeAlertDeals(editedId);
    }

    window.addEventListener("deals:refresh", onRefresh);
    window.addEventListener("alert:deleted", onAlertDeleted);
    window.addEventListener("alert:edited", onAlertEdited);
    return () => {
      window.removeEventListener("deals:refresh", onRefresh);
      window.removeEventListener("alert:deleted", onAlertDeleted);
      window.removeEventListener("alert:edited", onAlertEdited);
    };
  }, [fetchDeals]);

  const hasMore = deals.length < total;
  const isBusy = loading || refreshing;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t("title")}
          {!loading && (
            <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">
              ({total})
            </span>
          )}
        </h2>
        <button
          onClick={() => fetchDeals(true)}
          disabled={isBusy}
          aria-label={t("refresh")}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <RefreshCw size={14} className={isBusy ? "animate-spin" : ""} aria-hidden="true" />
          {t("refresh")}
        </button>
      </div>

      {/* Thin refresh progress bar — visible during background refresh only */}
      <div
        className={`h-0.5 rounded-full mb-4 overflow-hidden bg-blue-100 dark:bg-blue-900 transition-opacity duration-300 ${refreshing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden="true"
      >
        <div className="h-full w-2/5 bg-blue-500 rounded-full animate-shimmer" />
      </div>

      {/* Skeleton — only when no deals exist yet */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-xl p-4">
          {error}
        </div>
      )}

      {!loading && !error && deals.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
            {t("empty.title")}
          </p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
            {t("empty.subtitle")}
          </p>
        </div>
      )}

      {!loading && !error && deals.length > 0 && (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 transition-opacity duration-300 ${refreshing ? "opacity-60" : "opacity-100"}`}>
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={() => setSelectedDeal(deal)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => fetchDeals(false)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t("loadingMore")}
                  </>
                ) : (
                  t("loadMore", { count: Math.min(PAGE_SIZE, total - deals.length) })
                )}
              </button>
            </div>
          )}
        </>
      )}

      {selectedDeal && (
        <DealDetail
          deal={selectedDeal as any}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </div>
  );
}
