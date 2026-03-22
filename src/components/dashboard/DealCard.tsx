"use client";

import { Plane, MapPin, Calendar, ExternalLink, Star } from "lucide-react";

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
}

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : score >= 60
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-red-100 text-red-700 border-red-200";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}
    >
      <Star size={11} fill="currentColor" />
      {score}/100
    </span>
  );
}

export default function DealCard({ deal, onClick }: DealCardProps) {
  const departureDate = new Date(deal.departureDate).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-blue-500 shrink-0" />
            <span className="font-bold text-slate-900 text-base">
              {deal.origin} → {deal.destination}
            </span>
          </div>
          {deal.airline && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <Plane size={11} />
              {deal.airline}
            </div>
          )}
        </div>
        {deal.aiScore != null && <ScoreBadge score={deal.aiScore} />}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
        <Calendar size={11} />
        {departureDate}
        {deal.returnDate && (
          <span>
            {" "}
            – {new Date(deal.returnDate).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>

      {deal.aiSummary && (
        <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
          {deal.aiSummary}
        </p>
      )}

      <div className="flex items-end justify-between gap-2 pt-3 border-t border-slate-100">
        <div>
          <div className="text-xs text-slate-400">Vuelo</div>
          <div className="font-bold text-slate-900">
            {Number(deal.flightPrice).toLocaleString()} {deal.currency}
          </div>
          {deal.totalEstimate && (
            <div className="text-xs text-slate-500 mt-0.5">
              Total est. {Number(deal.totalEstimate).toLocaleString()} {deal.currency}
            </div>
          )}
        </div>

        {deal.bookingUrl && (
          <a
            href={deal.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
          >
            <ExternalLink size={12} />
            Reservar
          </a>
        )}
      </div>
    </div>
  );
}
