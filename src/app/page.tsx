export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">
        TravelDeals AI
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Encuentra chollos de viajes procesados con inteligencia artificial.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/dashboard"
          className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          Ir al Dashboard
        </a>
      </div>
    </main>
  );
}
