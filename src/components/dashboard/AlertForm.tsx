"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

interface AlertData {
  id?: string;
  origin?: string;
  destinations?: string[];
  passengers?: number;
  dateFrom?: string;
  dateTo?: string;
  tripDurationMin?: number | null;
  tripDurationMax?: number | null;
  maxBudget?: number | null;
  currency?: string;
  frequencyMinutes?: number;
}

interface AlertFormProps {
  onSuccess: (alertId: string, enqueued: boolean) => void;
  onClose: () => void;
  initialData?: AlertData;
}

const toDateInput = (iso: string) => iso.split("T")[0];

export default function AlertForm({ onSuccess, onClose, initialData }: AlertFormProps) {
  const t = useTranslations("alerts.form");
  const isEdit = !!initialData?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [origin, setOrigin] = useState(initialData?.origin ?? "");
  const [destinations, setDestinations] = useState(
    initialData?.destinations?.join(", ") ?? ""
  );
  const [passengers, setPassengers] = useState(initialData?.passengers ?? 1);
  const [dateFrom, setDateFrom] = useState(
    initialData?.dateFrom ? toDateInput(initialData.dateFrom) : ""
  );
  const [dateTo, setDateTo] = useState(
    initialData?.dateTo ? toDateInput(initialData.dateTo) : ""
  );
  const [tripDurationMin, setTripDurationMin] = useState<number | "">(
    initialData?.tripDurationMin ?? ""
  );
  const [tripDurationMax, setTripDurationMax] = useState<number | "">(
    initialData?.tripDurationMax ?? ""
  );
  const [maxBudget, setMaxBudget] = useState<number | "">(
    initialData?.maxBudget ?? ""
  );
  const [currency, setCurrency] = useState(initialData?.currency ?? "EUR");
  const [frequencyMinutes, setFrequencyMinutes] = useState(
    initialData?.frequencyMinutes ?? 720
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const destinationsArray = destinations
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length >= 2);

    if (destinationsArray.length === 0) {
      setError("Enter at least one destination.");
      return;
    }
    if (tripDurationMin === "" || tripDurationMax === "") {
      setError("Trip duration is required.");
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        origin: origin.trim(),
        destinations: destinationsArray,
        passengers,
        dateFrom: new Date(dateFrom).toISOString(),
        dateTo: new Date(dateTo).toISOString(),
        tripDurationMin,
        tripDurationMax,
        currency,
        frequencyMinutes,
        maxBudget: maxBudget !== "" ? maxBudget : null,
      };

      // Remove null maxBudget for create (API expects it absent, not null)
      if (!isEdit && body.maxBudget === null) delete body.maxBudget;

      const res = await fetch(
        isEdit ? `/api/alerts/${initialData!.id}` : "/api/alerts",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("error"));
        return;
      }

      const alertId = isEdit ? initialData!.id! : data.alert.id;
      const enqueued: boolean = isEdit ? (data.enqueued ?? true) : true;
      onSuccess(alertId, enqueued);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const labelClass =
    "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-transparent dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isEdit ? t("editTitle") : t("title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("origin")}</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                placeholder={t("originPlaceholder")}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("destinations")}</label>
              <input
                type="text"
                value={destinations}
                onChange={(e) => setDestinations(e.target.value)}
                required
                placeholder="London, Paris..."
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("passengers")}</label>
            <input
              type="number"
              value={passengers}
              onChange={(e) => setPassengers(parseInt(e.target.value))}
              min={1}
              max={10}
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("dateFrom")}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("dateTo")}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("durationMin")}</label>
              <input
                type="number"
                value={tripDurationMin}
                onChange={(e) =>
                  setTripDurationMin(e.target.value ? parseInt(e.target.value) : "")
                }
                min={1}
                required
                placeholder="3"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("durationMax")}</label>
              <input
                type="number"
                value={tripDurationMax}
                onChange={(e) =>
                  setTripDurationMax(e.target.value ? parseInt(e.target.value) : "")
                }
                min={1}
                required
                placeholder="10"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {t("budget")}{" "}
                <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </label>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) =>
                  setMaxBudget(e.target.value ? parseFloat(e.target.value) : "")
                }
                min={0}
                placeholder="1500"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("currency")}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputClass}
              >
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("frequency")}</label>
            <select
              value={frequencyMinutes}
              onChange={(e) => setFrequencyMinutes(parseInt(e.target.value))}
              className={inputClass}
            >
              <option value={0}>{t("freq0")}</option>
              <option value={60}>{t("freq60")}</option>
              <option value={360}>{t("freq360")}</option>
              <option value={720}>{t("freq720")}</option>
              <option value={1440}>{t("freq1440")}</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? isEdit ? t("saving") : t("creating")
                : isEdit ? t("save") : t("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
