"use client";

import { useState } from "react";
import { MapPin, Users, Calendar, Clock, Trash2, Pencil, Bell, BellOff, Tag, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

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
  onEdit: () => void;
}

export default function AlertCard({ alert, onUpdate, onEdit }: AlertCardProps) {
  const t = useTranslations("alerts");
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const FREQUENCY_LABELS: Record<number, string> = {
    60: t("form.freq60"),
    360: t("form.freq360"),
    720: t("form.freq720"),
    1440: t("form.freq1440"),
  };

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
    setDeleting(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, { method: "DELETE" });
      if (res.ok) {
        window.dispatchEvent(
          new CustomEvent("alert:deleted", { detail: { alertId: alert.id } })
        );
        onUpdate();
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const dateFrom = new Date(alert.dateFrom).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dateTo = new Date(alert.dateTo).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const destination =
    alert.destinations.length > 0
      ? alert.destinations.join(", ")
      : "—";

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border transition-all ${
        alert.isActive
          ? "border-slate-200 dark:border-slate-700 shadow-sm"
          : "border-slate-100 dark:border-slate-800 opacity-55"
      }`}
    >
      {/* Top accent */}
      <div
        className={`h-1 rounded-t-xl ${
          alert.isActive
            ? "bg-gradient-to-r from-blue-500 to-cyan-400"
            : "bg-slate-200 dark:bg-slate-700"
        }`}
      />

      <div className="p-4">
        {/* Route */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={13} className="text-blue-500 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
              {alert.origin}
            </span>
            <ArrowRight size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm truncate">
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Calendar size={11} className="text-slate-400 dark:text-slate-500" />
            {dateFrom}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={11} className="text-slate-400 dark:text-slate-500" />
            {dateTo}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={11} className="text-slate-400 dark:text-slate-500" />
            {alert.passengers === 1
              ? t("travelers", { count: alert.passengers })
              : t("travelersPlural", { count: alert.passengers })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={11} className="text-slate-400 dark:text-slate-500" />
            {FREQUENCY_LABELS[alert.frequencyMinutes] ?? `${alert.frequencyMinutes}min`}
          </span>
          {alert.maxBudget && (
            <span className="flex items-center gap-1.5 col-span-2">
              <Tag size={11} className="text-slate-400 dark:text-slate-500" />
              {t("maxBudget")} {Number(alert.maxBudget).toLocaleString()} {alert.currency}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleToggle}
            disabled={toggling || confirmDelete}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              alert.isActive
                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {alert.isActive ? <Bell size={11} /> : <BellOff size={11} />}
            {toggling ? "..." : alert.isActive ? t("active") : t("inactive")}
          </button>

          {!confirmDelete ? (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
              >
                <Pencil size={11} />
                {t("edit")}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <Trash2 size={11} />
                {t("delete")}
              </button>
            </>
          ) : (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? t("deleting") : t("confirmDelete")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
