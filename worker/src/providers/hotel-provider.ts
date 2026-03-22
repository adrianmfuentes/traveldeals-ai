import type { HotelOffer } from "../../src/types";
import { airportToCity } from "../lib/city-airports";

export interface HotelSearchParams {
  destination: string; // Airport code or city name
  checkIn: string;     // yyyy-MM-dd
  checkOut: string;    // yyyy-MM-dd
  adults: number;
  currency: string;
  maxBudget?: number;
}

// ─── Proveedor: SerpApi Google Hotels ───────────────

const serpApiHotelProvider = {
  name: "serpapi-hotels",

  isAvailable() {
    return !!process.env.SERPAPI_API_KEY;
  },

  async search(params: HotelSearchParams): Promise<HotelOffer[]> {
    // Resolve airport code to city name for the search query
    const cityName = airportToCity(params.destination);
    const query = `hotels in ${cityName}`;

    const searchParams = new URLSearchParams({
      engine: "google_hotels",
      q: query,
      check_in_date: params.checkIn,
      check_out_date: params.checkOut,
      adults: String(params.adults),
      currency: params.currency,
      api_key: process.env.SERPAPI_API_KEY!,
    });

    const res = await fetch(`https://serpapi.com/search?${searchParams}`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[SerpApi Hotels] HTTP ${res.status} para ${cityName}:`, errText);
      return [];
    }

    const data = await res.json();

    if (data.error) {
      console.error(`[SerpApi Hotels] Error de API para ${cityName}:`, data.error);
      return [];
    }

    const properties: any[] = data.properties ?? [];
    console.log(`[SerpApi Hotels] ${cityName}: ${properties.length} hoteles encontrados`);

    const offers: HotelOffer[] = properties
      .filter((p) => p.rate_per_night?.lowest != null)
      .map((p) => ({
        name: p.name ?? "Hotel desconocido",
        price: parseFloat(String(p.rate_per_night.lowest).replace(/[^0-9.]/g, "")) || 0,
        currency: params.currency,
        rating: p.overall_rating ?? p.star_rating,
        bookingUrl: p.link,
        raw: p,
        source: "serpapi-hotels" as const,
      }))
      .filter((o) => !params.maxBudget || o.price <= params.maxBudget);

    return offers;
  },
};

// ─── Función principal de búsqueda ──────────────────

export async function searchHotels(params: HotelSearchParams): Promise<HotelOffer[]> {
  if (!serpApiHotelProvider.isAvailable()) {
    console.log("[HotelProvider] No hay proveedores de hotel configurados. Configura SERPAPI_API_KEY.");
    return [];
  }

  try {
    return await serpApiHotelProvider.search(params);
  } catch (err) {
    console.error("[HotelProvider] Error buscando hoteles:", err);
    return [];
  }
}
