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

const SYSTEM_PROMPT = `Eres un experto analista de viajes y presupuestos con acceso a precios históricos del mercado. Tu trabajo es recibir datos crudos de una oferta de vuelo y devolver un análisis completo en formato JSON.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown, sin backticks.
2. Estima costes realistas de alojamiento, comida, transporte local y actividades en el destino.
3. Genera un itinerario diario con actividades reales y populares del destino.
4. Todos los precios deben estar en la moneda indicada.
5. CRÍTICO: Todos los valores numéricos en el JSON deben ser números literales ya calculados (ej: 57, 270, 1582). NUNCA uses expresiones matemáticas como "19 * 3" o "1525 + 57". JSON no admite expresiones, solo valores numéricos.

SISTEMA DE PUNTUACIÓN (score 0-100):
Empieza en 50 puntos y ajusta según estos factores:

PRECIO DEL VUELO vs media del mercado para esa ruta (factor principal, rango ±40 pts):
  +40 si el precio es ≥40% más barato que la media del mercado
  +30 si es 30-39% más barato
  +20 si es 20-29% más barato
  +10 si es 10-19% más barato
   0 si está en torno a la media (±10%)
  -10 si es 10-25% más caro
  -20 si es 25-40% más caro
  -30 si es más de 40% más caro que la media

ESCALAS (rango -20 a +10 pts):
  +10 vuelo directo sin escalas
    0 una escala con tiempo de conexión razonable (<3h)
  -10 dos escalas
  -20 tres o más escalas

DURACIÓN TOTAL del viaje (rango -10 a +5 pts):
  +5 duración igual o menor al tiempo directo habitual para esa distancia
   0 duración normal (hasta 50% más que el tiempo directo)
  -5 duración excesiva (50-100% más que el tiempo directo)
  -10 duración absurda (más del doble del tiempo directo)

RELACIÓN CALIDAD-PRECIO GLOBAL del viaje completo (vuelo + alojamiento + destino, rango -10 a +10 pts):
  +10 destino con coste de vida bajo Y precio de vuelo bajo: viaje muy económico en total
  +5 buen precio de vuelo con coste de vida moderado en destino
   0 precio de vuelo y coste de destino en línea con la media
  -5 vuelo en precio medio pero destino caro (ciudad premium: Londres, París, Zúrich...)
  -10 vuelo caro Y destino con coste de vida alto

AEROLÍNEA PARA EL PRECIO (rango -5 a +5 pts):
  +5 aerolínea de calidad (Iberia, Vueling, BA, Lufthansa...) a precio de low-cost o similar
   0 aerolínea acorde al precio (low-cost a precio low-cost, premium a precio premium)
  -5 aerolínea low-cost con precio superior al de aerolíneas de red para la misma ruta

ESCALA FINAL:
  85-100: EXCELENTE — Oferta muy por debajo del mercado, vale la pena reservar ya
  65-84:  BUENA — Precio claramente inferior a la media, buena oportunidad
  40-64:  NORMAL — Precio en torno a la media del mercado, ni destaca ni decepciona
  0-39:   CARA — Precio por encima de la media; salvo circunstancias especiales, no recomendable

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
  const { flight, passengers, tripDurationMin, hotel } = params;

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
    temperature: 0.3,
    response_format: { type: "json_object" }, // Enforces valid JSON output
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
