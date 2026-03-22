"use client";

import { X, ExternalLink, AlertTriangle, Star } from "lucide-react";

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
}

interface DealDetailProps {
  deal: Deal;
  onClose: () => void;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  const label =
    score >= 80 ? "Excelente oferta" : score >= 60 ? "Buena oferta" : "Oferta normal";
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-bold">{score}/100</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function DealDetail({ deal, onClose }: DealDetailProps) {
  const budget = deal.aiBudget as AiBudget | null;
  const itinerary = deal.aiItinerary as AiItineraryDay[] | null;
  const warnings = (deal as any).aiRawResponse?.warnings as string[] | undefined;

  const departureDate = new Date(deal.departureDate).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-100 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {deal.origin} → {deal.destination}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5 capitalize">{departureDate}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score */}
          {deal.aiScore != null && (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-yellow-500" fill="currentColor" />
                <span className="text-sm font-semibold text-slate-700">Puntuación de la oferta</span>
              </div>
              <ScoreBar score={deal.aiScore} />
            </div>
          )}

          {/* Summary */}
          {deal.aiSummary && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Resumen</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{deal.aiSummary}</p>
            </div>
          )}

          {/* Budget breakdown */}
          {budget && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Desglose del presupuesto</h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: "Vuelo", value: budget.flight },
                      { label: "Alojamiento", value: budget.hotel },
                      { label: "Comida", value: budget.food },
                      { label: "Actividades", value: budget.activities },
                      { label: "Transporte local", value: budget.transport },
                    ].map(({ label, value }) => (
                      <tr key={label} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 text-slate-600">{label}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                          {value.toLocaleString()} {budget.currency}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50">
                      <td className="px-4 py-3 font-bold text-slate-900">Total estimado</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700 text-base">
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
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">Avisos</span>
              </div>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-700 flex gap-2">
                    <span className="mt-1 shrink-0">•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Itinerary */}
          {itinerary && itinerary.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Itinerario día a día</h3>
              <div className="space-y-4">
                {itinerary.map((day) => (
                  <div key={day.day} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2.5">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                        Día {day.day}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{day.title}</h4>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {day.activities.map((activity, i) => (
                        <div key={i} className="px-4 py-3 flex gap-3">
                          <span className="text-xs text-blue-500 font-mono w-12 shrink-0 pt-0.5">
                            {activity.time}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800">{activity.description}</p>
                            {activity.tip && (
                              <p className="text-xs text-slate-400 mt-0.5 italic">
                                Consejo: {activity.tip}
                              </p>
                            )}
                          </div>
                          {activity.estimatedCost != null && activity.estimatedCost > 0 && (
                            <span className="text-xs font-medium text-slate-500 shrink-0">
                              ~{activity.estimatedCost} {budget?.currency ?? deal.currency}
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

          {/* Booking button */}
          {deal.bookingUrl && (
            <a
              href={deal.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors"
            >
              <ExternalLink size={16} />
              Reservar vuelo
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
