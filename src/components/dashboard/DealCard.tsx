"use client";

import { Plane, Calendar, ExternalLink, Hotel, ArrowRight } from "lucide-react";
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
  bookingUrl?: string | null;
  hotelName?: string | null;
  hotelPrice?: number | null;
  hotelBookingUrl?: string | null;
}

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

function ScoreBar({ score }: { score: number }) {
  const t = useTranslations("deals.score");

  const tier =
    score >= 85 ? "excellent" :
    score >= 65 ? "good" :
    score >= 40 ? "average" : "poor";

  const barColor =
    tier === "excellent" ? "bg-emerald-500" :
    tier === "good"      ? "bg-blue-500" :
    tier === "average"   ? "bg-amber-400" :
                           "bg-red-400";
  const textColor =
    tier === "excellent" ? "text-emerald-700 dark:text-emerald-400" :
    tier === "good"      ? "text-blue-700 dark:text-blue-400" :
    tier === "average"   ? "text-amber-700 dark:text-amber-400" :
                           "text-red-700 dark:text-red-400";
  const bgColor =
    tier === "excellent" ? "bg-emerald-50 dark:bg-emerald-950" :
    tier === "good"      ? "bg-blue-50 dark:bg-blue-950" :
    tier === "average"   ? "bg-amber-50 dark:bg-amber-950" :
                           "bg-red-50 dark:bg-red-950";

  const label = t(tier);

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${bgColor}`} aria-hidden="true">
      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
    </div>
  );
}

export default function DealCard({ deal, onClick }: DealCardProps) {
  const t = useTranslations("deals.card");
  const ts = useTranslations("deals.score");

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const score = deal.aiScore ?? 0;
  const accentColor =
    score >= 85 ? "from-emerald-400 to-teal-400" :
    score >= 65 ? "from-blue-400 to-cyan-400" :
    score >= 40 ? "from-amber-400 to-yellow-300" :
                  "from-red-400 to-rose-400";

  const scoreTier =
    score >= 85 ? "excellent" :
    score >= 65 ? "good" :
    score >= 40 ? "average" : "poor";

  const cardLabel = [
    `${deal.origin} → ${deal.destination}`,
    deal.airline,
    fmt(deal.departureDate),
    `${t("flightFrom")} ${Number(deal.flightPrice).toLocaleString()} ${deal.currency}`,
    deal.aiScore != null ? `${ts(scoreTier)} ${deal.aiScore}/100` : null,
  ].filter(Boolean).join(", ");

  return (
    <article className="relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all group">
      {/* Top gradient accent */}
      <div className={`h-1 bg-gradient-to-r ${accentColor}`} aria-hidden="true" />

      <div className="relative p-5">
        {/* Route */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <span>{deal.origin}</span>
            <ArrowRight size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <span>{deal.destination}</span>
          </div>
          {deal.aiScore != null && <ScoreBar score={deal.aiScore} />}
        </div>

        {/* Airline & date */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
          {deal.airline && (
            <span className="flex items-center gap-1.5">
              <Plane size={11} aria-hidden="true" />
              {deal.airline}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar size={11} aria-hidden="true" />
            {fmt(deal.departureDate)}
            {deal.returnDate &&
              ` – ${new Date(deal.returnDate).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}`}
          </span>
        </div>

        {/* Hotel */}
        {deal.hotelName && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5">
            <Hotel size={11} className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
            <span className="truncate">{deal.hotelName}</span>
            {deal.hotelPrice != null && (
              <span className="ml-auto shrink-0 font-medium text-slate-700 dark:text-slate-300">
                {Number(deal.hotelPrice).toLocaleString()} {deal.currency}
              </span>
            )}
          </div>
        )}

        {/* Summary */}
        {deal.aiSummary && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
            {deal.aiSummary}
          </p>
        )}

        {/* Price & CTA */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-end justify-between gap-2 mb-3">
            <div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">
                {t("flightFrom")}
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {Number(deal.flightPrice).toLocaleString()}
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">
                  {deal.currency}
                </span>
              </div>
              {deal.totalEstimate && (
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {t("totalEstimate")} {Number(deal.totalEstimate).toLocaleString()}{" "}
                  {deal.currency}
                </div>
              )}
            </div>
            <span
              className="text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:underline"
              aria-hidden="true"
            >
              {t("viewDetails")}
            </span>
          </div>

          {/* Booking links */}
          {(deal.bookingUrl || deal.hotelBookingUrl) && (
            <div className="relative z-10 flex flex-wrap gap-2">
              {deal.bookingUrl && (
                <a
                  href={deal.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${t("bookFlight")} — ${deal.origin} → ${deal.destination}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                >
                  <ExternalLink size={11} aria-hidden="true" />
                  {t("bookFlight")}
                  <span className="sr-only"> ({t("opensInNewTab")})</span>
                </a>
              )}
              {deal.hotelBookingUrl && (
                <a
                  href={deal.hotelBookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${t("bookHotel")}${deal.hotelName ? ` — ${deal.hotelName}` : ""}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                >
                  <ExternalLink size={11} aria-hidden="true" />
                  {t("bookHotel")}
                  <span className="sr-only"> ({t("opensInNewTab")})</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stretched invisible button that makes the whole card clickable/focusable */}
      <button
        onClick={onClick}
        aria-label={cardLabel}
        className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      />
    </article>
  );
}
