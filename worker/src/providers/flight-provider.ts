import type { FlightOffer } from "../../src/types";
import { CircuitBreaker } from "../lib/circuit-breaker";
import { resolveToAirportCodes } from "../lib/city-airports";
import { createLogger, toLogError } from "@platform/core/lib/logger";

const log = createLogger("FlightProvider");

// ─── Interfaz común para todos los proveedores ──────

interface SearchParams {
  origin: string;
  destinations: string[];
  dateFrom: Date;
  dateTo: Date;
  passengers: number;
  maxBudget?: number;
  currency: string;
  tripDurationMin?: number;
  tripDurationMax?: number;
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
        log.warn("Could not resolve origin", { origin: params.origin });
        return [];
      }
      if (destinations.length === 0) {
        log.warn("Could not resolve any destination", { destinations: params.destinations });
        return [];
      }

      for (const originCode of originCodes) {
      for (const dest of destinations) {
        const searchParams = new URLSearchParams({
          engine: "google_flights",
          departure_id: originCode,
          arrival_id: dest,
          outbound_date: params.dateFrom.toISOString().split("T")[0],
          return_date: new Date(
            params.dateFrom.getTime() + (params.tripDurationMin ?? 7) * 86_400_000
          ).toISOString().split("T")[0],
          adults: String(params.passengers),
          currency: params.currency,
          api_key: process.env.SERPAPI_API_KEY!,
        });

        const res = await fetch(`https://serpapi.com/search?${searchParams}`);
        if (!res.ok) {
          const errText = await res.text();
          log.error("SerpApi HTTP error", { route: `${originCode}→${dest}`, status: res.status, body: errText.slice(0, 200) });
          continue;
        }

        const data = await res.json();

        if (data.error) {
          log.error("SerpApi API error", { route: `${originCode}→${dest}`, error: data.error });
          continue;
        }

        log.debug("SerpApi results", {
          route: `${originCode}→${dest}`,
          best: data.best_flights?.length ?? 0,
          other: data.other_flights?.length ?? 0,
        });

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
    log.error("No flight providers available, check environment variables");
    return [];
  }

  log.debug("Using providers", { providers: activeProviders.map((p) => p.name) });

  const results = await Promise.allSettled(activeProviders.map((p) => p.search(params)));

  const allOffers: FlightOffer[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      log.info("Provider results", { provider: activeProviders[i].name, count: result.value.length });
      allOffers.push(...result.value);
    } else {
      log.error("Provider failed", { provider: activeProviders[i].name, ...toLogError(result.reason) });
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
