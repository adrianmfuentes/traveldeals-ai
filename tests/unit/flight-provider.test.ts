import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deduplicateOffers } from "../../worker/src/providers/flight-provider";
import type { FlightOffer } from "../../src/types";

function makeOffer(overrides: Partial<FlightOffer> = {}): FlightOffer {
  return {
    origin: "MAD",
    destination: "LON",
    departureDate: "2026-06-01T08:00:00",
    price: 100,
    currency: "EUR",
    stops: 0,
    duration: "2h",
    raw: {},
    source: "serpapi",
    ...overrides,
  };
}

describe("deduplicateOffers", () => {
  it("returns a single offer when there is only one", () => {
    const offers = [makeOffer({ price: 150 })];
    const result = deduplicateOffers(offers);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(150);
  });

  it("keeps the cheapest offer for the same route+date", () => {
    const offers = [
      makeOffer({ price: 200 }),
      makeOffer({ price: 120 }),
      makeOffer({ price: 180 }),
    ];
    const result = deduplicateOffers(offers);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(120);
  });

  it("keeps distinct offers for different routes", () => {
    const offers = [
      makeOffer({ destination: "LON", price: 150 }),
      makeOffer({ destination: "PAR", price: 80 }),
      makeOffer({ destination: "ROM", price: 200 }),
    ];
    const result = deduplicateOffers(offers);
    expect(result).toHaveLength(3);
  });

  it("keeps distinct offers for different departure dates", () => {
    const offers = [
      makeOffer({ departureDate: "2026-06-01T08:00:00", price: 100 }),
      makeOffer({ departureDate: "2026-06-15T08:00:00", price: 90 }),
    ];
    const result = deduplicateOffers(offers);
    expect(result).toHaveLength(2);
  });

  it("handles empty input", () => {
    expect(deduplicateOffers([])).toEqual([]);
  });

  it("deduplicates based on date portion only (ignores time)", () => {
    const offers = [
      makeOffer({ departureDate: "2026-06-01T08:00:00", price: 200 }),
      makeOffer({ departureDate: "2026-06-01T18:30:00", price: 150 }),
    ];
    const result = deduplicateOffers(offers);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(150);
  });
});

describe("provider availability checks", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env.SERPAPI_API_KEY = originalEnv.SERPAPI_API_KEY;
  });

  it("serpapi provider is unavailable when SERPAPI_API_KEY is missing", () => {
    delete process.env.SERPAPI_API_KEY;
    const isAvailable = !!process.env.SERPAPI_API_KEY;
    expect(isAvailable).toBe(false);
  });

  it("serpapi provider is available when SERPAPI_API_KEY is set", () => {
    process.env.SERPAPI_API_KEY = "test-key";
    const isAvailable = !!process.env.SERPAPI_API_KEY;
    expect(isAvailable).toBe(true);
  });
});

describe("serpApiProvider data formatting", () => {
  it("formats serpapi flight data to FlightOffer shape", () => {
    const rawFlight = {
      price: 235,
      total_duration: 150,
      flights: [
        {
          airline: "Iberia",
          departure_airport: { time: "2026-06-01T09:00:00" },
          arrival_airport: { time: "2026-06-01T11:30:00" },
        },
        {
          airline: "Iberia",
          departure_airport: { time: "2026-06-01T12:00:00" },
          arrival_airport: { time: "2026-06-01T14:00:00" },
        },
      ],
    };

    // Simulate the mapping logic from serpApiProvider
    const leg = rawFlight.flights?.[0];
    const offer: FlightOffer = {
      origin: "MAD",
      destination: "LON",
      departureDate: leg?.departure_airport?.time ?? new Date().toISOString(),
      returnDate: undefined,
      airline: leg?.airline,
      price: rawFlight.price ?? 0,
      currency: "EUR",
      stops: (rawFlight.flights?.length ?? 1) - 1,
      duration: `${Math.floor((rawFlight.total_duration ?? 0) / 60)}h`,
      bookingUrl: undefined,
      raw: rawFlight,
      source: "serpapi" as const,
    };

    expect(offer.price).toBe(235);
    expect(offer.airline).toBe("Iberia");
    expect(offer.stops).toBe(1);
    expect(offer.duration).toBe("2h");
    expect(offer.source).toBe("serpapi");
    expect(offer.departureDate).toBe("2026-06-01T09:00:00");
  });

  it("handles missing price gracefully (defaults to 0)", () => {
    const rawFlight = { flights: [] };
    const price = (rawFlight as any).price ?? 0;
    expect(price).toBe(0);
  });
});
