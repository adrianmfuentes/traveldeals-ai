import Anthropic from "@anthropic-ai/sdk";
import type { FlightOffer, AiDealAnalysis } from "../../src/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── System Prompt para el LLM ──────────────────────

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
}

export async function analyzeDealWithAI(params: AnalyzeParams): Promise<AiDealAnalysis> {
  const { flight, passengers, tripDurationMin, tripDurationMax } = params;

  const tripDays = tripDurationMin ?? 3; // Por defecto 3 días

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

CONTEXTO:
- Número de viajeros: ${passengers}
- Duración del viaje: ${tripDays} días
- Presupuesto del vuelo es POR PERSONA. Calcula el presupuesto total para ${passengers} persona(s).

Genera el análisis completo en JSON.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: userPrompt }],
    system: SYSTEM_PROMPT,
  });

  // Extraer el texto de la respuesta
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Parsear JSON (limpiar posibles backticks)
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
    console.error("[AI] Error parseando respuesta:", cleaned.substring(0, 200));
    throw new Error(`Error parseando respuesta de IA: ${(err as Error).message}`);
  }
}
