import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FlightOffer, AiDealAnalysis } from "../../src/types";

// ── Shared mock state ────────────────────────────────────────────────────────

const prismaFindUnique = vi.fn();
const prismaFindFirst = vi.fn();
const prismaCreate = vi.fn();
const prismaUpdate = vi.fn();

const mockSearchFlights = vi.fn();
const mockSearchHotels = vi.fn();
const mockAnalyzeDeal = vi.fn();
const mockSendEmail = vi.fn();

// ── Mocks (must be at top level for hoisting) ─────────────────────────────────

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(function () {
    return {
      searchAlert: { findUnique: prismaFindUnique },
      deal: { findFirst: prismaFindFirst, create: prismaCreate, update: prismaUpdate },
    };
  }),
}));

vi.mock("../../worker/src/providers/flight-provider", () => ({
  searchFlights: mockSearchFlights,
}));

vi.mock("../../worker/src/providers/hotel-provider", () => ({
  searchHotels: mockSearchHotels,
}));

vi.mock("../../worker/src/services/ai-analyzer", () => ({
  analyzeDealWithAI: mockAnalyzeDeal,
}));

vi.mock("../../worker/src/services/email", () => ({
  sendDealNotification: mockSendEmail,
}));

vi.mock("date-fns", () => ({
  addDays: vi.fn().mockImplementation((date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }),
  format: vi.fn().mockImplementation((date: Date) => date.toISOString().split("T")[0]),
  startOfDay: vi.fn().mockImplementation((date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }),
  endOfDay: vi.fn().mockImplementation((date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }),
}));

// ── Import module under test AFTER mocks ─────────────────────────────────────

const { processSearchAlert } = await import("../../worker/src/jobs/search-alert.job");

// ── Test fixtures ─────────────────────────────────────────────────────────────

const mockPrismaAlert = {
  id: "alert-1",
  isActive: true,
  origin: "MAD",
  destinations: ["LON"],
  dateFrom: new Date("2026-06-01"),
  dateTo: new Date("2026-06-30"),
  passengers: 2,
  maxBudget: null,
  currency: "EUR",
  tripDurationMin: 7,
  tripDurationMax: 10,
  user: { id: "user-1", email: "test@example.com" },
};

const mockDeal = { id: "deal-1", isNotified: false };

const mockFlight: FlightOffer = {
  origin: "MAD",
  destination: "LON",
  departureDate: "2026-06-15T08:00:00",
  returnDate: "2026-06-22T18:00:00",
  airline: "Iberia",
  price: 120,
  currency: "EUR",
  stops: 0,
  duration: "2h30m",
  bookingUrl: "https://example.com/book",
  raw: {},
  source: "amadeus",
};

const mockAnalysis: AiDealAnalysis = {
  summary: "Excelente vuelo directo a buen precio.",
  score: 82,
  budget: {
    flight: 240,
    hotel: 700,
    food: 350,
    activities: 200,
    transport: 100,
    total: 1590,
    currency: "EUR",
  },
  itinerary: [
    {
      day: 1,
      title: "Llegada",
      activities: [{ time: "14:00", description: "Check-in", estimatedCost: 0 }],
    },
  ],
  warnings: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("processSearchAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaFindUnique.mockResolvedValue(mockPrismaAlert);
    prismaFindFirst.mockResolvedValue(null);
    prismaCreate.mockResolvedValue(mockDeal);
    prismaUpdate.mockResolvedValue({ ...mockDeal });
    mockSearchFlights.mockResolvedValue([mockFlight]);
    mockSearchHotels.mockResolvedValue([]);
    mockAnalyzeDeal.mockResolvedValue(mockAnalysis);
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("returns early when alert is not found", async () => {
    prismaFindUnique.mockResolvedValueOnce(null);
    await processSearchAlert("nonexistent-alert");
    expect(mockSearchFlights).not.toHaveBeenCalled();
  });

  it("returns early when alert is inactive", async () => {
    prismaFindUnique.mockResolvedValueOnce({ ...mockPrismaAlert, isActive: false });
    await processSearchAlert("alert-1");
    expect(mockSearchFlights).not.toHaveBeenCalled();
  });

  it("returns early when no flights are found", async () => {
    mockSearchFlights.mockResolvedValueOnce([]);
    await processSearchAlert("alert-1");
    expect(prismaCreate).not.toHaveBeenCalled();
  });

  it("creates a deal for each top flight", async () => {
    const flights = [
      { ...mockFlight, price: 100, destination: "LON" },
      { ...mockFlight, price: 150, destination: "PAR" },
      { ...mockFlight, price: 200, destination: "ROM" },
    ];
    mockSearchFlights.mockResolvedValueOnce(flights);

    await processSearchAlert("alert-1");

    expect(prismaCreate).toHaveBeenCalledTimes(3);
    expect(mockAnalyzeDeal).toHaveBeenCalledTimes(3);
  });

  it("updates deal status to READY after successful AI analysis", async () => {
    await processSearchAlert("alert-1");

    const updateCalls = prismaUpdate.mock.calls.map((c: any) => c[0].data);
    const readyUpdate = updateCalls.find((d: any) => d.status === "READY");
    expect(readyUpdate).toBeDefined();
    expect(readyUpdate?.aiProcessed).toBe(true);
    expect(readyUpdate?.aiScore).toBe(82);
  });

  it("updates deal status to ERROR when AI analysis throws", async () => {
    mockAnalyzeDeal.mockRejectedValueOnce(new Error("AI unavailable"));

    await processSearchAlert("alert-1");

    const updateCalls = prismaUpdate.mock.calls.map((c: any) => c[0].data);
    const errorUpdate = updateCalls.find((d: any) => d.status === "ERROR");
    expect(errorUpdate).toBeDefined();
  });

  it("sends email notification when score >= 70 and deal not notified", async () => {
    await processSearchAlert("alert-1");

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: "test@example.com",
        deal: expect.objectContaining({ aiScore: 82 }),
      })
    );
  });

  it("does not send email when score < 70", async () => {
    mockAnalyzeDeal.mockResolvedValueOnce({ ...mockAnalysis, score: 65 });

    await processSearchAlert("alert-1");

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sets isNotified = true after sending email", async () => {
    await processSearchAlert("alert-1");

    const updateCalls = prismaUpdate.mock.calls.map((c: any) => c[0].data);
    const notifiedUpdate = updateCalls.find((d: any) => d.isNotified === true);
    expect(notifiedUpdate).toBeDefined();
  });

  it("limits processing to top 5 flights by price", async () => {
    const manyFlights = Array.from({ length: 10 }, (_, i) => ({
      ...mockFlight,
      price: 100 + i * 10,
      destination: `D${i.toString().padStart(2, "0")}`,
    }));
    mockSearchFlights.mockResolvedValueOnce(manyFlights);

    await processSearchAlert("alert-1");

    expect(prismaCreate).toHaveBeenCalledTimes(5);
  });

  it("updates the existing deal instead of creating a duplicate on a repeat run", async () => {
    prismaFindFirst.mockResolvedValueOnce({
      id: "deal-1",
      flightPrice: 120,
      isNotified: true,
    });

    await processSearchAlert("alert-1");

    expect(prismaCreate).not.toHaveBeenCalled();
    expect(prismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "deal-1" } })
    );
  });

  it("does not re-send the notification for an already-notified deal with an unchanged price", async () => {
    prismaFindFirst.mockResolvedValueOnce({
      id: "deal-1",
      flightPrice: 120,
      isNotified: true,
    });
    prismaUpdate.mockResolvedValue({ id: "deal-1", isNotified: true });

    await processSearchAlert("alert-1");

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("re-sends the notification when the price has dropped since the last notification", async () => {
    prismaFindFirst.mockResolvedValueOnce({
      id: "deal-1",
      flightPrice: 150,
      isNotified: true,
    });
    prismaUpdate.mockResolvedValueOnce({ id: "deal-1", isNotified: false });

    await processSearchAlert("alert-1");

    expect(prismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal-1" },
        data: expect.objectContaining({ isNotified: false }),
      })
    );
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });
});
