"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import AlertCard from "./AlertCard";
import AlertForm from "./AlertForm";

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

export default function AlertsSection() {
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function fetchAlerts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Error al cargar alertas");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      setError("No se pudieron cargar las alertas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Mis alertas
          {!loading && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({alerts.length})
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          Nueva alerta
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
          {error}
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div
          onClick={() => setShowForm(true)}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors group"
        >
          <Plus size={24} className="mx-auto text-slate-300 group-hover:text-blue-400 mb-2" />
          <p className="text-sm font-medium text-slate-400 group-hover:text-blue-600">
            Crea tu primera alerta de viaje
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Configuraremos búsquedas automáticas y te avisaremos cuando detectemos una buena oferta
          </p>
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onUpdate={fetchAlerts} />
          ))}
        </div>
      )}

      {showForm && (
        <AlertForm
          onSuccess={() => {
            setShowForm(false);
            fetchAlerts();
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
