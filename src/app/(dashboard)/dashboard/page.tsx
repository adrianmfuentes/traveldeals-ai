export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Tus alertas de viaje y ofertas encontradas aparecerán aquí.
      </p>

      {/* TODO: Componentes de alertas y ofertas */}
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
          + Crear nueva alerta
        </div>
      </div>
    </div>
  );
}
