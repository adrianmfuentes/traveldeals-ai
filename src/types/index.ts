// ─── Tipos compartidos entre front y worker ─────────

export interface FlightOffer {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  airline?: string;
  price: number;
  currency: string;
  stops: number;
  duration: string;
  bookingUrl?: string;
  raw: Record<string, unknown>;
  source: "serpapi" | "scraping";
}

export interface HotelOffer {
  name: string;
  price: number;
  currency: string;
  rating?: number;
  bookingUrl?: string;
  raw: Record<string, unknown>;
  source: string;
}

export interface AiBudget {
  flight: number;
  hotel: number;
  food: number;
  activities: number;
  transport: number;
  total: number;
  currency: string;
}

export interface AiItineraryDay {
  day: number;
  title: string;
  activities: {
    time: string;
    description: string;
    estimatedCost?: number;
    tip?: string;
  }[];
}

export interface AiDealAnalysis {
  summary: string;
  score: number; // 0-100
  budget: AiBudget;
  itinerary: AiItineraryDay[];
  warnings?: string[];
}

export interface SearchAlertInput {
  origin: string;
  destinations: string[];
  passengers: number;
  dateFrom: string;
  dateTo: string;
  tripDurationMin?: number;
  tripDurationMax?: number;
  maxBudget?: number;
  currency?: string;
  frequencyMinutes?: number;
}
