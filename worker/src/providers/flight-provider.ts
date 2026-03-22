import type { FlightOffer } from "../../src/types";

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

// ─── Proveedor: Amadeus ─────────────────────────────

const amadeusProvider: FlightProvider = {
  name: "amadeus",

  isAvailable() {
    return !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
  },

  async search(params): Promise<FlightOffer[]> {
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
    const destinations = params.destinations.length > 0
      ? params.destinations
      : ["LON", "PAR", "ROM", "LIS", "BER"]; // Destinos por defecto si no se especifica

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
            bookingUrl: undefined, // Amadeus no da URL directa
            raw: offer,
            source: "amadeus",
          });
        }

        // Pequeña pausa entre destinos para no saturar el rate limit
        await sleep(500);
      } catch (err) {
        console.error(`[Amadeus] Error en ${dest}:`, err);
      }
    }

    return allOffers;
  },
};

// ─── Proveedor: Kiwi (Tequila) ─────────────────────

const kiwiProvider: FlightProvider = {
  name: "kiwi",

  isAvailable() {
    return !!process.env.KIWI_API_KEY;
  },

  async search(params): Promise<FlightOffer[]> {
    const destinations = params.destinations.length > 0
      ? params.destinations.join(",")
      : undefined; // Kiwi soporta búsqueda abierta

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

    try {
      const res = await fetch(
        `https://api.tequila.kiwi.com/v2/search?${searchParams}`,
        { headers: { apikey: process.env.KIWI_API_KEY! } }
      );

      if (!res.ok) {
        console.warn(`[Kiwi] Error: ${res.status}`);
        return [];
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
    } catch (err) {
      console.error("[Kiwi] Error:", err);
      return [];
    }
  },
};

// ─── Orquestador: usa todos los proveedores disponibles ─

const providers: FlightProvider[] = [amadeusProvider, kiwiProvider];

export async function searchFlights(params: SearchParams): Promise<FlightOffer[]> {
  const activeProviders = providers.filter((p) => p.isAvailable());

  if (activeProviders.length === 0) {
    console.error("[FlightProvider] ⚠️ No hay proveedores configurados. Revisa las variables de entorno.");
    return [];
  }

  console.log(`[FlightProvider] Usando proveedores: ${activeProviders.map((p) => p.name).join(", ")}`);

  // Ejecutar todos los proveedores en paralelo
  const results = await Promise.allSettled(
    activeProviders.map((p) => p.search(params))
  );

  const allOffers: FlightOffer[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      console.log(`[FlightProvider] ${activeProviders[i].name}: ${result.value.length} ofertas`);
      allOffers.push(...result.value);
    } else {
      console.error(`[FlightProvider] ${activeProviders[i].name} falló:`, result.reason);
    }
  }

  // Deduplicar por ruta + fecha + precio similar
  return deduplicateOffers(allOffers);
}

// ─── Helpers ────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateKiwi(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function deduplicateOffers(offers: FlightOffer[]): FlightOffer[] {
  const seen = new Map<string, FlightOffer>();

  for (const offer of offers) {
    const key = `${offer.origin}-${offer.destination}-${offer.departureDate.split("T")[0]}`;
    const existing = seen.get(key);

    // Quedarnos con la oferta más barata para cada ruta+fecha
    if (!existing || offer.price < existing.price) {
      seen.set(key, offer);
    }
  }

  return Array.from(seen.values());
}
