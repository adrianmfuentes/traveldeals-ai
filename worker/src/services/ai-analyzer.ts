import Groq from "groq-sdk";
import type { FlightOffer, HotelOffer, AiDealAnalysis } from "../../src/types";
import { createLogger } from "@platform/core/lib/logger";

const log = createLogger("AI");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Best free model on Groq: fast + capable for structured JSON tasks
const MODEL = "llama-3.3-70b-versatile";

// ─── System Prompt ──────────────────────────────────

const SYSTEM_PROMPT = `Eres un experto analista de viajes y presupuestos. Tu trabajo es recibir datos crudos de una oferta de vuelo y devolver un análisis completo en formato JSON.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown, sin backticks.
2. Evalúa si el precio del vuelo es bueno comparado con la media del mercado para esa ruta.
3. Estima costes realistas de alojamiento, comida, transporte local y actividades en el destino.
4. Genera un itinerario diario con actividades reales y populares del destino.
5. Todos los precios deben estar en la moneda indicada.
6. El score (0-100) debe reflejar lo buena que es la oferta: 80+ es excelente, 60-79 es buena, 40-59 es normal, <40 es cara.

FORMATO DE RESPUESTA (JSON exacto):
{
  "summary": "Resumen de 2-3 frases sobre el viaje y por qué es buena o mala oferta",
  "score": 75,
  "budget": {
    "flight": 120,
    "hotel": 350,
    "food": 200,
    "activities": 100,
    "transport": 50,
    "total": 820,
    "currency": "EUR"
  },
  "itinerary": [
    {
      "day": 1,
      "title": "Llegada y exploración del centro",
      "activities": [
        {
          "time": "10:00",
          "description": "Check-in en el hotel y descanso",
          "estimatedCost": 0,
          "tip": "Reserva con antelación para mejores precios"
        },
        {
          "time": "13:00",
          "description": "Almuerzo en restaurante local",
          "estimatedCost": 15,
          "tip": "Prueba la gastronomía local"
        }
      ]
    }
  ],
  "warnings": ["El vuelo tiene 2 escalas, lo que suma 5 horas extra"]
}`;

// ─── Función principal ──────────────────────────────

interface AnalyzeParams {
  flight: FlightOffer;
  passengers: number;
  tripDurationMin?: number | null;
  tripDurationMax?: number | null;
  hotel?: HotelOffer;
}

export async function analyzeDealWithAI(params: AnalyzeParams): Promise<AiDealAnalysis> {
  const { flight, passengers, tripDurationMin, tripDurationMax, hotel } = params;

  const tripDays = tripDurationMin ?? 3;

  const hotelSection = hotel
    ? `
DATOS DEL ALOJAMIENTO:
- Hotel: ${hotel.name}
- Precio total alojamiento: ${hotel.price} ${hotel.currency}
- Valoración: ${hotel.rating ? `${hotel.rating}/5` : "No disponible"}
- Fuente: ${hotel.source}
`
    : "";

  const userPrompt = `Analiza esta oferta de vuelo y genera un plan de viaje completo:

DATOS DEL VUELO:
- Ruta: ${flight.origin} → ${flight.destination}
- Fecha de ida: ${flight.departureDate}
- Fecha de vuelta: ${flight.returnDate ?? "No especificada (estimar " + tripDays + " días)"}
- Aerolínea: ${flight.airline ?? "No especificada"}
- Precio del vuelo: ${flight.price} ${flight.currency} (por persona)
- Escalas: ${flight.stops}
- Duración: ${flight.duration}
- Fuente: ${flight.source}
${hotelSection}
CONTEXTO:
- Número de viajeros: ${passengers}
- Duración del viaje: ${tripDays} días
- Presupuesto del vuelo es POR PERSONA. Calcula el presupuesto total para ${passengers} persona(s).
${hotel ? `- Usa el precio de hotel proporcionado en el campo "hotel" del presupuesto en lugar de estimarlo.` : ""}

Genera el análisis completo en JSON.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.3, // Lower = more deterministic JSON
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  // Limpiar posibles backticks o markdown
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();

  try {
    const analysis: AiDealAnalysis = JSON.parse(cleaned);

    // Validaciones básicas
    if (typeof analysis.score !== "number" || analysis.score < 0 || analysis.score > 100) {
      analysis.score = 50; // Fallback
    }

    if (!analysis.budget || typeof analysis.budget.total !== "number") {
      throw new Error("Budget inválido en la respuesta de IA");
    }

    return analysis;
  } catch (err) {
    log.error("Failed to parse AI response", { preview: cleaned.substring(0, 200) });
    throw new Error(`Error parseando respuesta de IA: ${(err as Error).message}`);
  }
}
