"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import DealCard from "./DealCard";
import DealDetail from "./DealDetail";
import { useTranslations } from "next-intl";

interface Deal {
  id: string;
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
}

interface DealsSectionProps {
  alertId?: string;
}

export default function DealsSection({ alertId }: DealsSectionProps) {
  const t = useTranslations("deals");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  async function fetchDeals() {
    setLoading(true);
    setError("");
    try {
      const url = alertId
        ? `/api/deals?alertId=${alertId}&status=READY`
        : `/api/deals?status=READY`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setDeals(data.deals ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDeals();
  }, [alertId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t("title")}
          {!loading && (
            <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">
              ({deals.length})
            </span>
          )}
        </h2>
        <button
          onClick={fetchDeals}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {t("refresh")}
        </button>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => setSelectedDeal(deal)}
            />
          ))}
        </div>
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
