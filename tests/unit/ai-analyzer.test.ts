import { describe, it, expect, vi } from "vitest";
import type { FlightOffer } from "../../src/types";

// Mock must be at top level — vi.mock is hoisted
const mockCreate = vi.fn();

vi.mock("groq-sdk", () => {
  const Groq = vi.fn().mockImplementation(function () {
    return { chat: { completions: { create: mockCreate } } };
  });
  return { default: Groq };
});

// Import AFTER the mock is set up
const { analyzeDealWithAI } = await import("../../worker/src/services/ai-analyzer");

const mockFlight: FlightOffer = {
  origin: "MAD",
  destination: "LON",
  departureDate: "2026-06-01T08:00:00",
  returnDate: "2026-06-08T18:00:00",
  airline: "Iberia",
  price: 120,
  currency: "EUR",
  stops: 0,
  duration: "2h30m",
  bookingUrl: "https://example.com/book",
  raw: {},
  source: "amadeus",
};

const validAiResponse = {
  summary: "Vuelo directo a Londres a buen precio.",
  score: 78,
  budget: {
    flight: 240,
    hotel: 700,
    food: 300,
    activities: 150,
    transport: 80,
    total: 1470,
    currency: "EUR",
  },
  itinerary: [
    {
      day: 1,
      title: "Llegada y exploración",
      activities: [
        {
          time: "14:00",
          description: "Check-in en el hotel",
          estimatedCost: 0,
          tip: "Reserva con antelación",
        },
      ],
    },
  ],
  warnings: ["Vuelo directo, sin escalas"],
};

// Wraps text in the Groq chat-completion response shape (choices[0].message.content).
function groqResponse(text: string) {
  return { choices: [{ message: { content: text } }] };
}

describe("analyzeDealWithAI", () => {
  it("parses a valid JSON response from Groq", async () => {
    mockCreate.mockResolvedValue(groqResponse(JSON.stringify(validAiResponse)));

    const result = await analyzeDealWithAI({ flight: mockFlight, passengers: 2, tripDurationMin: 7 });

    expect(result.summary).toBe("Vuelo directo a Londres a buen precio.");
    expect(result.score).toBe(78);
    expect(result.budget.total).toBe(1470);
    expect(result.budget.currency).toBe("EUR");
    expect(result.itinerary).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });

  it("strips markdown backticks from response before parsing", async () => {
    const withBackticks = "```json\n" + JSON.stringify(validAiResponse) + "\n```";
    mockCreate.mockResolvedValue(groqResponse(withBackticks));

    const result = await analyzeDealWithAI({ flight: mockFlight, passengers: 1 });
    expect(result.score).toBe(78);
    expect(result.budget.total).toBe(1470);
  });

  it("falls back to score=50 when score is invalid (negative)", async () => {
    mockCreate.mockResolvedValue(groqResponse(JSON.stringify({ ...validAiResponse, score: -10 })));

    const result = await analyzeDealWithAI({ flight: mockFlight, passengers: 1 });
    expect(result.score).toBe(50);
  });

  it("falls back to score=50 when score exceeds 100", async () => {
    mockCreate.mockResolvedValue(groqResponse(JSON.stringify({ ...validAiResponse, score: 150 })));

    const result = await analyzeDealWithAI({ flight: mockFlight, passengers: 1 });
    expect(result.score).toBe(50);
  });

  it("throws when budget.total is missing", async () => {
    const withoutTotal = {
      ...validAiResponse,
      budget: { flight: 100, hotel: 200, food: 100, activities: 50, transport: 30, currency: "EUR" },
    };
    mockCreate.mockResolvedValue(groqResponse(JSON.stringify(withoutTotal)));

    await expect(analyzeDealWithAI({ flight: mockFlight, passengers: 1 })).rejects.toThrow(
      "Budget inválido"
    );
  });

  it("throws when budget is missing entirely", async () => {
    mockCreate.mockResolvedValue(groqResponse(JSON.stringify({ summary: "Test", score: 75, itinerary: [] })));

    await expect(analyzeDealWithAI({ flight: mockFlight, passengers: 1 })).rejects.toThrow();
  });

  it("throws when response is invalid JSON", async () => {
    mockCreate.mockResolvedValue(groqResponse("this is not json at all"));

    await expect(analyzeDealWithAI({ flight: mockFlight, passengers: 1 })).rejects.toThrow();
  });
});
