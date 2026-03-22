import Link from "next/link";
import { Plane, Bell, Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="font-bold text-lg text-white">TravelDeals AI</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Registrarse gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center px-6 pt-20 pb-24">
        <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full border border-blue-500/30 mb-6">
          <Sparkles size={12} />
          Powered by Anthropic Claude
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6">
          Encuentra chollos de viaje
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            con inteligencia artificial
          </span>
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
          Configura alertas de búsqueda y nuestro sistema monitorizará vuelos 24/7.
          Cuando encuentre un chollo, la IA lo analiza y genera un itinerario completo con
          presupuesto detallado.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/30"
          >
            Empezar gratis
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors border border-white/20"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        {[
          {
            icon: <Bell size={20} />,
            title: "Alertas automáticas",
            desc: "Configura origen, destinos y presupuesto. El sistema busca vuelos automáticamente según la frecuencia que elijas.",
          },
          {
            icon: <Plane size={20} />,
            title: "Múltiples proveedores",
            desc: "Buscamos en Amadeus, Kiwi y Google Flights simultáneamente para encontrar los mejores precios con deduplicación.",
          },
          {
            icon: <Sparkles size={20} />,
            title: "Análisis con IA",
            desc: "Claude analiza cada oferta, evalúa si es un buen precio, estima el presupuesto total y genera un itinerario personalizado.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-4">
              {f.icon}
            </div>
            <h3 className="font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
