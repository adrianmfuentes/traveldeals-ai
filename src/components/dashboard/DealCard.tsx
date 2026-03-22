"use client";

import { Plane, Calendar, ExternalLink, Hotel, ArrowRight } from "lucide-react";

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

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
      ? "bg-amber-400"
      : "bg-red-400";
  const label =
    score >= 80 ? "Excelente" : score >= 60 ? "Buena oferta" : "Regular";
  const textColor =
    score >= 80
      ? "text-emerald-700"
      : score >= 60
      ? "text-amber-700"
      : "text-red-700";
  const bgColor =
    score >= 80
      ? "bg-emerald-50"
      : score >= 60
      ? "bg-amber-50"
      : "bg-red-50";

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${bgColor}`}>
      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
    </div>
  );
}

export default function DealCard({ deal, onClick }: DealCardProps) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const accentColor =
    (deal.aiScore ?? 0) >= 80
      ? "from-emerald-400 to-teal-400"
      : (deal.aiScore ?? 0) >= 60
      ? "from-amber-400 to-yellow-300"
      : "from-blue-400 to-cyan-400";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all group"
    >
      {/* Top gradient accent */}
      <div className={`h-1 bg-gradient-to-r ${accentColor}`} />

      <div className="p-5">
        {/* Route */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <span>{deal.origin}</span>
            <ArrowRight size={14} className="text-slate-400" />
            <span>{deal.destination}</span>
          </div>
          {deal.aiScore != null && <ScoreBar score={deal.aiScore} />}
        </div>

        {/* Airline & date */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          {deal.airline && (
            <span className="flex items-center gap-1.5">
              <Plane size={11} />
              {deal.airline}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar size={11} />
            {fmt(deal.departureDate)}
            {deal.returnDate && ` – ${new Date(deal.returnDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
          </span>
        </div>

        {/* Hotel */}
        {deal.hotelName && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 bg-slate-50 rounded-lg px-2.5 py-1.5">
            <Hotel size={11} className="text-slate-400" />
            <span className="truncate">{deal.hotelName}</span>
            {deal.hotelPrice != null && (
              <span className="ml-auto shrink-0 font-medium text-slate-700">
                {Number(deal.hotelPrice).toLocaleString()} {deal.currency}
              </span>
            )}
          </div>
        )}

        {/* Summary */}
        {deal.aiSummary && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {deal.aiSummary}
          </p>
        )}

        {/* Price & CTA */}
        <div className="flex items-end justify-between gap-2 pt-3 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Vuelo desde</div>
            <div className="text-xl font-extrabold text-slate-900">
              {Number(deal.flightPrice).toLocaleString()}
              <span className="text-sm font-semibold text-slate-500 ml-1">{deal.currency}</span>
            </div>
            {deal.totalEstimate && (
              <div className="text-xs text-slate-400 mt-0.5">
                Total estimado {Number(deal.totalEstimate).toLocaleString()} {deal.currency}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600 font-medium group-hover:underline">
              Ver detalles
            </span>
            {deal.bookingUrl && (
              <a
                href={deal.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
              >
                <ExternalLink size={11} />
                Reservar
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
