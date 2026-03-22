"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AlertFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AlertForm({ onSuccess, onClose }: AlertFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [origin, setOrigin] = useState("");
  const [destinations, setDestinations] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tripDurationMin, setTripDurationMin] = useState<number | "">("");
  const [tripDurationMax, setTripDurationMax] = useState<number | "">("");
  const [maxBudget, setMaxBudget] = useState<number | "">("");
  const [currency, setCurrency] = useState("EUR");
  const [frequencyMinutes, setFrequencyMinutes] = useState(720);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const destinationsArray = destinations
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length >= 2);

      const body: Record<string, unknown> = {
        origin: origin.trim(),
        destinations: destinationsArray,
        passengers,
        dateFrom: new Date(dateFrom).toISOString(),
        dateTo: new Date(dateTo).toISOString(),
        currency,
        frequencyMinutes,
      };

      if (tripDurationMin !== "") body.tripDurationMin = tripDurationMin;
      if (tripDurationMax !== "") body.tripDurationMax = tripDurationMax;
      if (maxBudget !== "") body.maxBudget = maxBudget;

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al crear la alerta");
        return;
      }

      onSuccess();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Nueva alerta de viaje</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Origen
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                placeholder="Madrid, MAD..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Destinos (separados por coma)
              </label>
              <input
                type="text"
                value={destinations}
                onChange={(e) => setDestinations(e.target.value)}
                placeholder="London, Paris (opcional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Número de viajeros
            </label>
            <input
              type="number"
              value={passengers}
              onChange={(e) => setPassengers(parseInt(e.target.value))}
              min={1}
              max={10}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duración mín. (días)
              </label>
              <input
                type="number"
                value={tripDurationMin}
                onChange={(e) =>
                  setTripDurationMin(e.target.value ? parseInt(e.target.value) : "")
                }
                min={1}
                placeholder="3"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duración máx. (días)
              </label>
              <input
                type="number"
                value={tripDurationMax}
                onChange={(e) =>
                  setTripDurationMax(e.target.value ? parseInt(e.target.value) : "")
                }
                min={1}
                placeholder="10"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Presupuesto máximo
              </label>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) =>
                  setMaxBudget(e.target.value ? parseFloat(e.target.value) : "")
                }
                min={0}
                placeholder="1500"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Frecuencia de búsqueda
            </label>
            <select
              value={frequencyMinutes}
              onChange={(e) => setFrequencyMinutes(parseInt(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={60}>Cada hora</option>
              <option value={360}>Cada 6 horas</option>
              <option value={720}>Cada 12 horas</option>
              <option value={1440}>Cada 24 horas</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creando..." : "Crear alerta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
