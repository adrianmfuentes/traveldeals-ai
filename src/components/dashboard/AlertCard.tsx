"use client";

import { useState } from "react";
import { MapPin, Users, Calendar, Clock, Trash2, Bell, BellOff, Tag, ArrowRight } from "lucide-react";

interface SearchAlertWithCount {
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

interface AlertCardProps {
  alert: SearchAlertWithCount;
  onUpdate: () => void;
}

const FREQUENCY_LABELS: Record<number, string> = {
  60: "Cada hora",
  360: "Cada 6h",
  720: "Cada 12h",
  1440: "Cada día",
};

export default function AlertCard({ alert, onUpdate }: AlertCardProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !alert.isActive }),
      });
      if (res.ok) onUpdate();
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta alerta? Se borrarán también todas sus ofertas.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, { method: "DELETE" });
      if (res.ok) onUpdate();
    } finally {
      setDeleting(false);
    }
  }

  const dateFrom = new Date(alert.dateFrom).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dateTo = new Date(alert.dateTo).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const destination =
    alert.destinations.length > 0 ? alert.destinations.join(", ") : "Cualquier destino";

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        alert.isActive
          ? "border-slate-200 shadow-sm"
          : "border-slate-100 opacity-55"
      }`}
    >
      {/* Top accent */}
      <div className={`h-1 rounded-t-xl ${alert.isActive ? "bg-gradient-to-r from-blue-500 to-cyan-400" : "bg-slate-200"}`} />

      <div className="p-4">
        {/* Route */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={13} className="text-blue-500 shrink-0" />
            <span className="font-bold text-slate-900 text-sm truncate">
              {alert.origin}
            </span>
            <ArrowRight size={12} className="text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-700 text-sm truncate">
              {destination}
            </span>
          </div>
          {alert._count.deals > 0 && (
            <span className="shrink-0 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {alert._count.deals}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={11} className="text-slate-400" />
            {dateFrom}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={11} className="text-slate-400" />
            {dateTo}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={11} className="text-slate-400" />
            {alert.passengers} viajero{alert.passengers !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={11} className="text-slate-400" />
            {FREQUENCY_LABELS[alert.frequencyMinutes] ?? `${alert.frequencyMinutes}min`}
          </span>
          {alert.maxBudget && (
            <span className="flex items-center gap-1.5 col-span-2">
              <Tag size={11} className="text-slate-400" />
              Máx. {Number(alert.maxBudget).toLocaleString()} {alert.currency}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              alert.isActive
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {alert.isActive ? <Bell size={11} /> : <BellOff size={11} />}
            {toggling ? "..." : alert.isActive ? "Activa" : "Inactiva"}
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={11} />
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
