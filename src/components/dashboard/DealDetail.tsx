"use client";

import { useEffect, useRef } from "react";
import { X, ExternalLink, AlertTriangle, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { isSafeHttpUrl } from "@/lib/safe-url";

interface AiBudget {
  flight: number;
  hotel: number;
  food: number;
  activities: number;
  transport: number;
  total: number;
  currency: string;
}

interface AiItineraryDay {
  day: number;
  title: string;
  activities: {
    time: string;
    description: string;
    estimatedCost?: number;
    tip?: string;
  }[];
}

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
  aiBudget?: AiBudget | null;
  aiItinerary?: AiItineraryDay[] | null;
  bookingUrl?: string | null;
  hotelName?: string | null;
  hotelPrice?: number | null;
  hotelBookingUrl?: string | null;
}

interface DealDetailProps {
  deal: Deal;
  onClose: () => void;
}

function ScoreBar({ score }: { score: number }) {
  const ts = useTranslations("deals.score");

  const color =
    score >= 80
      ? "bg-green-500"
      : score >= 60
      ? "bg-yellow-500"
      : "bg-red-500";
  const label =
    score >= 80
      ? ts("excellent")
      : score >= 60
      ? ts("good")
      : ts("average");

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-bold">{score}/100</span>
      </div>
      <div
        className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${score}/100`}
      >
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function DealDetail({ deal, onClose }: DealDetailProps) {
  const t = useTranslations("deals.detail");
  const tb = useTranslations("deals.detail.budget");
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = "deal-detail-title";

  const budget = deal.aiBudget as AiBudget | null;
  const itinerary = deal.aiItinerary as AiItineraryDay[] | null;
  const warnings = (deal as any).aiRawResponse?.warnings as string[] | undefined;

  const departureDate = new Date(deal.departureDate).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Focus trap + Escape key + restore focus on close
  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 pt-16 sm:pt-0"
      aria-hidden="false"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain border border-transparent dark:border-slate-800 outline-none"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 z-10">
          <div>
            <h2
              id={titleId}
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100"
            >
              {deal.origin} → {deal.destination}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
              {departureDate}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Score */}
          {deal.aiScore != null && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star
                  size={16}
                  className="text-yellow-500"
                  fill="currentColor"
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t("score")}
                </span>
              </div>
              <ScoreBar score={deal.aiScore} />
            </div>
          )}

          {/* Summary */}
          {deal.aiSummary && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t("summary")}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {deal.aiSummary}
              </p>
            </div>
          )}

          {/* Budget breakdown */}
          {budget && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {tb("title")}
              </h3>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <caption className="sr-only">{tb("title")}</caption>
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">{tb("category")}</th>
                      <th scope="col">{tb("amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: tb("flight"), value: budget.flight },
                      { label: tb("hotel"), value: budget.hotel },
                      { label: tb("food"), value: budget.food },
                      { label: tb("activities"), value: budget.activities },
                      { label: tb("transport"), value: budget.transport },
                    ].map(({ label, value }) => (
                      <tr
                        key={label}
                        className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                          {label}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                          {value.toLocaleString()} {budget.currency}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 dark:bg-blue-950">
                      <th
                        scope="row"
                        className="px-4 py-3 text-left font-bold text-slate-900 dark:text-slate-100"
                      >
                        {tb("total")}
                      </th>
                      <td className="px-4 py-3 text-right font-bold text-blue-700 dark:text-blue-400 text-base">
                        {budget.total.toLocaleString()} {budget.currency}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div
              role="note"
              className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle
                  size={15}
                  className="text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {t("warnings")}
                </span>
              </div>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-sm text-amber-700 dark:text-amber-400"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Itinerary */}
          {itinerary && itinerary.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {t("itinerary")}
              </h3>
              <div className="space-y-4">
                {itinerary.map((day) => (
                  <div
                    key={day.day}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
                  >
                    <div className="bg-blue-50 dark:bg-blue-950 px-4 py-2.5">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        {t("estimatedCost", { day: day.day })}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                        {day.title}
                      </h4>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {day.activities.map((activity, i) => (
                        <div key={i} className="px-4 py-3 flex gap-3">
                          <span
                            className="text-xs text-blue-500 dark:text-blue-400 font-mono w-12 shrink-0 pt-0.5"
                            aria-label={activity.time}
                          >
                            {activity.time}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 dark:text-slate-200">
                              {activity.description}
                            </p>
                            {activity.tip && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">
                                {t("tip")}: {activity.tip}
                              </p>
                            )}
                          </div>
                          {activity.estimatedCost != null &&
                            activity.estimatedCost > 0 && (
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                                ~{activity.estimatedCost}{" "}
                                {budget?.currency ?? deal.currency}
                              </span>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking buttons */}
          {(isSafeHttpUrl(deal.bookingUrl) || isSafeHttpUrl(deal.hotelBookingUrl)) && (
            <div className="flex flex-col sm:flex-row gap-3">
              {isSafeHttpUrl(deal.bookingUrl) && (
                <a
                  href={deal.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  {t("bookFlight")}
                  <span className="sr-only"> ({t("opensInNewTab")})</span>
                </a>
              )}
              {isSafeHttpUrl(deal.hotelBookingUrl) && (
                <a
                  href={deal.hotelBookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-xl py-3 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  {t("bookHotel")}
                  <span className="sr-only"> ({t("opensInNewTab")})</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
