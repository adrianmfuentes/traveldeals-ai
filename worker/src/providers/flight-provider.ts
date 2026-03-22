import type { FlightOffer } from "../../src/types";
import { CircuitBreaker } from "../lib/circuit-breaker";
import { resolveToAirportCodes } from "../lib/city-airports";

// ─── Interfaz común para todos los proveedores ──────

interface SearchParams {
  origin: string;
  destinations: string[];
  dateFrom: Date;
  dateTo: Date;
  passengers: number;
  maxBudget?: number;
  currency: string;
}

interface FlightProvider {
  name: string;
  isAvailable(): boolean;
  search(params: SearchParams): Promise<FlightOffer[]>;
}

// ─── Circuit Breakers ────────────────────────────────

const serpApiBreaker = new CircuitBreaker("serpapi");

// ─── Proveedor: SerpApi (Google Flights) ────────────

const serpApiProvider: FlightProvider = {
  name: "serpapi",

  isAvailable() {
    return !!process.env.SERPAPI_API_KEY;
  },

  async search(params): Promise<FlightOffer[]> {
    return serpApiBreaker.execute(async () => {
      // Resolve city names / codes to airport IATA codes
      const rawDestinations =
        params.destinations.length > 0 ? params.destinations : ["London", "Paris", "Rome"];
      const destinations = rawDestinations.flatMap(resolveToAirportCodes);
      const originCodes = resolveToAirportCodes(params.origin);
      const allOffers: FlightOffer[] = [];

      if (originCodes.length === 0) {
        console.error(`[FlightProvider] No se pudo resolver el origen: "${params.origin}"`);
        return [];
      }
      if (destinations.length === 0) {
        console.error(`[FlightProvider] No se pudo resolver ningún destino: ${JSON.stringify(params.destinations)}`);
        return [];
      }

      for (const originCode of originCodes) {
      for (const dest of destinations) {
        const searchParams = new URLSearchParams({
          engine: "google_flights",
          departure_id: originCode,
          arrival_id: dest,
          outbound_date: params.dateFrom.toISOString().split("T")[0],
          return_date: params.dateTo.toISOString().split("T")[0],
          adults: String(params.passengers),
          currency: params.currency,
          api_key: process.env.SERPAPI_API_KEY!,
        });

        const res = await fetch(`https://serpapi.com/search?${searchParams}`);
        if (!res.ok) {
          const errText = await res.text();
          console.error(`[SerpApi] HTTP ${res.status} para ${originCode}→${dest}:`, errText);
          continue;
        }

        const data = await res.json();

        if (data.error) {
          console.error(`[SerpApi] Error de API para ${originCode}→${dest}:`, data.error);
          continue;
        }

        console.log(`[SerpApi] ${originCode}→${dest}: best_flights=${data.best_flights?.length ?? 0}, other_flights=${data.other_flights?.length ?? 0}`);

        for (const flight of data.best_flights ?? data.other_flights ?? []) {
          const leg = flight.flights?.[0];
          allOffers.push({
            origin: originCode,
            destination: dest,
            departureDate: leg?.departure_airport?.time ?? params.dateFrom.toISOString(),
            returnDate: undefined,
            airline: leg?.airline,
            price: flight.price ?? 0,
            currency: params.currency,
            stops: (flight.flights?.length ?? 1) - 1,
            duration: `${Math.floor((flight.total_duration ?? 0) / 60)}h`,
            bookingUrl: undefined,
            raw: flight,
            source: "serpapi" as const,
          });
        }

        await new Promise((r) => setTimeout(r, 300));
      }
      } // end originCodes loop

      return allOffers;
    });
  },
};

// ─── Orquestador: usa todos los proveedores disponibles ─

const providers: FlightProvider[] = [serpApiProvider];

export async function searchFlights(params: SearchParams): Promise<FlightOffer[]> {
  const activeProviders = providers.filter(
    (p) => p.isAvailable() && getBreaker(p.name).isAvailable()
  );

  if (activeProviders.length === 0) {
    console.error(
      "[FlightProvider] No hay proveedores configurados. Revisa las variables de entorno."
    );
    return [];
  }

  console.log(
    `[FlightProvider] Usando proveedores: ${activeProviders.map((p) => p.name).join(", ")}`
  );

  const results = await Promise.allSettled(activeProviders.map((p) => p.search(params)));

  const allOffers: FlightOffer[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      console.log(
        `[FlightProvider] ${activeProviders[i].name}: ${result.value.length} ofertas`
      );
      allOffers.push(...result.value);
    } else {
      console.error(
        `[FlightProvider] ${activeProviders[i].name} falló:`,
        result.reason
      );
    }
  }

  return deduplicateOffers(allOffers);
}

// ─── Helpers ────────────────────────────────────────

function getBreaker(name: string): CircuitBreaker {
  if (name === "serpapi") return serpApiBreaker;
  return new CircuitBreaker(name);
}

export function deduplicateOffers(offers: FlightOffer[]): FlightOffer[] {
  const seen = new Map<string, FlightOffer>();

  for (const offer of offers) {
    const key = `${offer.origin}-${offer.destination}-${offer.departureDate.split("T")[0]}`;
    const existing = seen.get(key);

    if (!existing || offer.price < existing.price) {
      seen.set(key, offer);
    }
  }

  return Array.from(seen.values());
}
