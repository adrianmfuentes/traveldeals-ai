import { PrismaClient } from "@prisma/client";
import { searchFlights } from "../providers/flight-provider";
import { searchHotels } from "../providers/hotel-provider";
import { analyzeDealWithAI } from "../services/ai-analyzer";
import { sendDealNotification } from "../services/email";
import { addDays, format } from "date-fns";

const prisma = new PrismaClient();

export async function processSearchAlert(alertId: string): Promise<void> {
  const alert = await prisma.searchAlert.findUnique({
    where: { id: alertId },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!alert || !alert.isActive) {
    console.log(`[Job] Alerta ${alertId} no encontrada o inactiva, saltando.`);
    return;
  }

  console.log(
    `[Job] Buscando vuelos: ${alert.origin} → ${
      alert.destinations.length > 0 ? alert.destinations.join(", ") : "cualquier destino"
    }`
  );

  // ─── 1. Buscar vuelos ──────────────────────────────
  const flights = await searchFlights({
    origin: alert.origin,
    destinations: alert.destinations,
    dateFrom: alert.dateFrom,
    dateTo: alert.dateTo,
    passengers: alert.passengers,
    maxBudget: alert.maxBudget ? Number(alert.maxBudget) : undefined,
    currency: alert.currency,
  });

  if (flights.length === 0) {
    console.log(`[Job] No se encontraron vuelos para alerta ${alertId}`);
    return;
  }

  console.log(`[Job] Encontrados ${flights.length} vuelos. Procesando mejores ofertas...`);

  // ─── 2. Tomar las 5 mejores ofertas por precio ─────
  const topFlights = flights.sort((a, b) => a.price - b.price).slice(0, 5);

  // ─── 3. Crear deals y procesarlos con IA ───────────
  for (const flight of topFlights) {
    const deal = await prisma.deal.create({
      data: {
        alertId: alert.id,
        userId: alert.user.id,
        origin: flight.origin,
        destination: flight.destination,
        departureDate: new Date(flight.departureDate),
        returnDate: flight.returnDate ? new Date(flight.returnDate) : null,
        airline: flight.airline,
        flightPrice: flight.price,
        flightData: flight.raw,
        flightSource: flight.source,
        bookingUrl: flight.bookingUrl,
        currency: flight.currency,
        status: "PROCESSING",
      },
    });

    try {
      // ─── 4. Buscar hotel para el destino ───────────
      const departureDate = new Date(flight.departureDate);
      const tripDays = alert.tripDurationMin ?? 3;
      const checkIn = format(departureDate, "yyyy-MM-dd");
      const checkOut = format(
        flight.returnDate
          ? new Date(flight.returnDate)
          : addDays(departureDate, tripDays),
        "yyyy-MM-dd"
      );

      const hotels = await searchHotels({
        destination: flight.destination,
        checkIn,
        checkOut,
        adults: alert.passengers,
        currency: flight.currency,
        maxBudget: alert.maxBudget ? Number(alert.maxBudget) : undefined,
      });

      // Tomar el hotel más barato
      const cheapestHotel =
        hotels.length > 0
          ? hotels.sort((a, b) => a.price - b.price)[0]
          : null;

      // Actualizar deal con datos del hotel si encontramos uno
      if (cheapestHotel) {
        await prisma.deal.update({
          where: { id: deal.id },
          data: {
            hotelName: cheapestHotel.name,
            hotelPrice: cheapestHotel.price,
            hotelData: cheapestHotel.raw,
            hotelSource: cheapestHotel.source,
            hotelBookingUrl: cheapestHotel.bookingUrl,
          },
        });
      }

      // ─── 5. Analizar con IA ──────────────────────────
      const analysis = await analyzeDealWithAI({
        flight,
        passengers: alert.passengers,
        tripDurationMin: alert.tripDurationMin,
        tripDurationMax: alert.tripDurationMax,
        hotel: cheapestHotel ?? undefined,
      });

      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          aiProcessed: true,
          aiSummary: analysis.summary,
          aiBudget: analysis.budget as any,
          aiItinerary: analysis.itinerary as any,
          aiScore: analysis.score,
          aiRawResponse: analysis as any,
          totalEstimate: analysis.budget.total,
          status: "READY",
        },
      });

      console.log(`[Job] Deal ${deal.id} procesado — Score: ${analysis.score}/100`);

      // ─── 6. Enviar notificación por email ────────────
      if (analysis.score >= 70 && !deal.isNotified) {
        try {
          await sendDealNotification({
            userEmail: alert.user.email,
            deal: {
              origin: flight.origin,
              destination: flight.destination,
              departureDate: flight.departureDate,
              airline: flight.airline,
              flightPrice: flight.price,
              currency: flight.currency,
              aiScore: analysis.score,
              aiSummary: analysis.summary,
              totalEstimate: analysis.budget.total,
              bookingUrl: flight.bookingUrl,
            },
          });

          await prisma.deal.update({
            where: { id: deal.id },
            data: { isNotified: true },
          });

          console.log(`[Job] Notificación enviada para deal ${deal.id}`);
        } catch (emailErr) {
          console.error(`[Job] Error enviando email para deal ${deal.id}:`, emailErr);
        }
      }
    } catch (err) {
      console.error(`[Job] Error procesando deal ${deal.id}:`, err);
      await prisma.deal.update({
        where: { id: deal.id },
        data: { status: "ERROR" },
      });
    }
  }
}
