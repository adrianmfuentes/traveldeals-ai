import type { HotelOffer } from "../../src/types";

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  currency: string;
  maxBudget?: number;
}

interface HotelProvider {
  name: string;
  isAvailable(): boolean;
  search(params: HotelSearchParams): Promise<HotelOffer[]>;
}

// ─── Proveedor: Amadeus Hotels ───────────────────────

const amadeusHotelProvider: HotelProvider = {
  name: "amadeus",

  isAvailable() {
    return !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
  },

  async search(params: HotelSearchParams): Promise<HotelOffer[]> {
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

    // 2. Obtener lista de hoteles en la ciudad
    const hotelsListRes = await fetch(
      `https://api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${params.destination}&radius=5&radiusUnit=KM&hotelSource=ALL`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!hotelsListRes.ok) {
      console.warn(`[AmadeusHotels] Error obteniendo hoteles en ${params.destination}: ${hotelsListRes.status}`);
      return [];
    }

    const hotelsListData = await hotelsListRes.json();
    const hotelIds: string[] = (hotelsListData.data ?? [])
      .slice(0, 10)
      .map((h: any) => h.hotelId as string);

    if (hotelIds.length === 0) return [];

    // 3. Buscar ofertas de hotel
    const offersParams = new URLSearchParams({
      hotelIds: hotelIds.join(","),
      adults: String(params.adults),
      checkInDate: params.checkIn,
      checkOutDate: params.checkOut,
      currency: params.currency,
      max: "5",
    });

    const offersRes = await fetch(
      `https://api.amadeus.com/v2/shopping/hotel-offers?${offersParams}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!offersRes.ok) {
      console.warn(`[AmadeusHotels] Error obteniendo ofertas: ${offersRes.status}`);
      return [];
    }

    const offersData = await offersRes.json();

    const results: HotelOffer[] = [];
    for (const hotelData of offersData.data ?? []) {
      const hotel = hotelData.hotel;
      const offer = hotelData.offers?.[0];
      if (!offer) continue;

      results.push({
        name: hotel?.name ?? "Hotel desconocido",
        price: parseFloat(offer.price?.total ?? "0"),
        currency: offer.price?.currency ?? params.currency,
        rating: hotel?.rating ? Number(hotel.rating) : undefined,
        bookingUrl: undefined,
        raw: hotelData,
        source: "amadeus",
      });
    }

    return results;
  },
};

// ─── Función principal de búsqueda ──────────────────

export async function searchHotels(params: HotelSearchParams): Promise<HotelOffer[]> {
  if (!amadeusHotelProvider.isAvailable()) {
    console.log("[HotelProvider] No hay proveedores de hotel configurados.");
    return [];
  }

  try {
    const offers = await amadeusHotelProvider.search(params);
    console.log(`[HotelProvider] ${offers.length} hoteles encontrados en ${params.destination}`);
    return offers;
  } catch (err) {
    console.error("[HotelProvider] Error buscando hoteles:", err);
    return [];
  }
}
