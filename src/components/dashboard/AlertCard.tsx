"use client";

import { useState } from "react";
import { MapPin, Users, Calendar, Clock, Trash2, Bell, BellOff, Tag } from "lucide-react";

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

  return (
    <div
      className={`bg-white rounded-xl border p-5 transition-all ${
        alert.isActive
          ? "border-slate-200 shadow-sm"
          : "border-slate-100 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-blue-500 shrink-0" />
            <span className="font-semibold text-slate-900 text-sm truncate">
              {alert.origin}
              {alert.destinations.length > 0
                ? ` → ${alert.destinations.join(", ")}`
                : " → Cualquier destino"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users size={11} />
              {alert.passengers} viajero{alert.passengers !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {dateFrom} – {dateTo}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {FREQUENCY_LABELS[alert.frequencyMinutes] ?? `${alert.frequencyMinutes}min`}
            </span>
            {alert.maxBudget && (
              <span className="flex items-center gap-1">
                <Tag size={11} />
                Max {Number(alert.maxBudget).toLocaleString()} {alert.currency}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {alert._count.deals > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {alert._count.deals} oferta{alert._count.deals !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            alert.isActive
              ? "bg-green-50 text-green-700 hover:bg-green-100"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {alert.isActive ? (
            <>
              <Bell size={12} /> Activa
            </>
          ) : (
            <>
              <BellOff size={12} /> Inactiva
            </>
          )}
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />
          {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </div>
  );
}
