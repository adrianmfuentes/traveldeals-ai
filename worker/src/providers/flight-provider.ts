import type { FlightOffer } from "../../src/types";
import { CircuitBreaker } from "../lib/circuit-breaker";

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

const amadeusBreaker = new CircuitBreaker("amadeus");
const kiwiBreaker = new CircuitBreaker("kiwi");
const serpApiBreaker = new CircuitBreaker("serpapi");

// ─── Proveedor: Amadeus ─────────────────────────────

const amadeusProvider: FlightProvider = {
  name: "amadeus",

  isAvailable() {
    return !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
  },

  async search(params): Promise<FlightOffer[]> {
    return amadeusBreaker.execute(async () => {
      // 1. Obtener token de acceso
      const tokenRes = await fetch("https://api.amadeus.com/v1/security/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.AMADEUS_CLIENT_ID!,
          client_secret: process.env.AMADEUS_CLIENT_SECRET!,
        }),
      });

      if (!tokenRes.ok) throw new Error(`Amadeus auth failed: ${tokenRes.status}`);
      const { access_token } = await tokenRes.json();

      // 2. Buscar vuelos (para cada destino, o destino abierto)
      const destinations =
        params.destinations.length > 0
          ? params.destinations
          : ["LON", "PAR", "ROM", "LIS", "BER"];

      const allOffers: FlightOffer[] = [];

      for (const dest of destinations) {
        const searchParams = new URLSearchParams({
          originLocationCode: params.origin,
          destinationLocationCode: dest,
          departureDate: params.dateFrom.toISOString().split("T")[0],
          adults: String(params.passengers),
          currencyCode: params.currency,
          max: "10",
          nonStop: "false",
        });

        if (params.maxBudget) {
          searchParams.set("maxPrice", String(params.maxBudget));
        }

        try {
          const res = await fetch(
            `https://api.amadeus.com/v2/shopping/flight-offers?${searchParams}`,
            { headers: { Authorization: `Bearer ${access_token}` } }
          );

          if (!res.ok) {
            console.warn(`[Amadeus] Error buscando ${params.origin}→${dest}: ${res.status}`);
            continue;
          }

          const data = await res.json();

          for (const offer of data.data ?? []) {
            const segment = offer.itineraries?.[0]?.segments?.[0];
            allOffers.push({
              origin: params.origin,
              destination: dest,
              departureDate: segment?.departure?.at ?? params.dateFrom.toISOString(),
              returnDate: offer.itineraries?.[1]?.segments?.[0]?.departure?.at,
              airline: segment?.carrierCode,
              price: parseFloat(offer.price?.total ?? "0"),
              currency: offer.price?.currency ?? params.currency,
              stops: (offer.itineraries?.[0]?.segments?.length ?? 1) - 1,
              duration: offer.itineraries?.[0]?.duration ?? "",
              bookingUrl: undefined,
              raw: offer,
              source: "amadeus",
            });
          }

          await sleep(500);
        } catch (err) {
          console.error(`[Amadeus] Error en ${dest}:`, err);
        }
      }

      return allOffers;
    });
  },
};

// ─── Proveedor: Kiwi (Tequila) ─────────────────────

const kiwiProvider: FlightProvider = {
  name: "kiwi",

  isAvailable() {
    return !!process.env.KIWI_API_KEY;
  },

  async search(params): Promise<FlightOffer[]> {
    return kiwiBreaker.execute(async () => {
      const destinations =
        params.destinations.length > 0 ? params.destinations.join(",") : undefined;

      const searchParams = new URLSearchParams({
        fly_from: params.origin,
        date_from: formatDateKiwi(params.dateFrom),
        date_to: formatDateKiwi(params.dateTo),
        adults: String(params.passengers),
        curr: params.currency,
        limit: "20",
        sort: "price",
        one_for_city: "1",
      });

      if (destinations) searchParams.set("fly_to", destinations);
      if (params.maxBudget) searchParams.set("price_to", String(params.maxBudget));

      const res = await fetch(
        `https://api.tequila.kiwi.com/v2/search?${searchParams}`,
        { headers: { apikey: process.env.KIWI_API_KEY! } }
      );

      if (!res.ok) {
        throw new Error(`[Kiwi] Error: ${res.status}`);
      }

      const data = await res.json();

      return (data.data ?? []).map((flight: any) => ({
        origin: flight.flyFrom,
        destination: flight.flyTo,
        departureDate: flight.local_departure,
        returnDate: flight.local_arrival_return ?? undefined,
        airline: flight.airlines?.[0],
        price: flight.price,
        currency: params.currency,
        stops: (flight.route?.length ?? 1) - 1,
        duration: `${Math.floor((flight.duration?.total ?? 0) / 3600)}h`,
        bookingUrl: flight.deep_link,
        raw: flight,
        source: "kiwi" as const,
      }));
    });
  },
};

// ─── Proveedor: SerpApi (Google Flights) ────────────

const serpApiProvider: FlightProvider = {
  name: "serpapi",

  isAvailable() {
    return !!process.env.SERPAPI_API_KEY;
  },

  async search(params): Promise<FlightOffer[]> {
    return serpApiBreaker.execute(async () => {
      const destinations =
        params.destinations.length > 0 ? params.destinations : ["LON", "PAR", "ROM"];
      const allOffers: FlightOffer[] = [];

      for (const dest of destinations) {
        const searchParams = new URLSearchParams({
          engine: "google_flights",
          departure_id: params.origin,
          arrival_id: dest,
          outbound_date: params.dateFrom.toISOString().split("T")[0],
          return_date: params.dateTo.toISOString().split("T")[0],
          adults: String(params.passengers),
          currency: params.currency,
          api_key: process.env.SERPAPI_API_KEY!,
        });

        const res = await fetch(`https://serpapi.com/search?${searchParams}`);
        if (!res.ok) continue;

        const data = await res.json();

        for (const flight of data.best_flights ?? data.other_flights ?? []) {
          const leg = flight.flights?.[0];
          allOffers.push({
            origin: params.origin,
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

      return allOffers;
    });
  },
};

// ─── Orquestador: usa todos los proveedores disponibles ─

const providers: FlightProvider[] = [amadeusProvider, kiwiProvider, serpApiProvider];

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
  switch (name) {
    case "amadeus":
      return amadeusBreaker;
    case "kiwi":
      return kiwiBreaker;
    case "serpapi":
      return serpApiBreaker;
    default:
      return new CircuitBreaker(name);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateKiwi(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
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
