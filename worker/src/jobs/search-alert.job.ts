import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import IORedis from "ioredis";
import { createLogger, toLogError } from "@platform/core/lib/logger";
import { searchFlights } from "../providers/flight-provider";
import { searchHotels } from "../providers/hotel-provider";
import { analyzeDealWithAI } from "../services/ai-analyzer";
import { sendDealNotification } from "../services/email";
import { addDays, format, startOfDay, endOfDay } from "date-fns";

const log = createLogger("Job");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type JobResult = { status: "done" | "no_flights" | "error"; dealsCount?: number };

async function writeResult(redis: IORedis, alertId: string, result: JobResult) {
  await redis.set(`alert:result:${alertId}`, JSON.stringify(result), "EX", 600);
}

export async function processSearchAlert(alertId: string, redis?: IORedis): Promise<void> {
  const alert = await prisma.searchAlert.findUnique({
    where: { id: alertId },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!alert || !alert.isActive) {
    log.warn("Alert not found or inactive, skipping", { alertId });
    return;
  }

  log.info("Starting flight search", {
    alertId,
    origin: alert.origin,
    destinations: alert.destinations.length > 0 ? alert.destinations : ["any"],
  });

  // ─── 1. Buscar vuelos ──────────────────────────────
  const flights = await searchFlights({
    origin: alert.origin,
    destinations: alert.destinations,
    dateFrom: alert.dateFrom,
    dateTo: alert.dateTo,
    passengers: alert.passengers,
    maxBudget: alert.maxBudget ? Number(alert.maxBudget) : undefined,
    currency: alert.currency,
    tripDurationMin: alert.tripDurationMin ?? undefined,
    tripDurationMax: alert.tripDurationMax ?? undefined,
  });

  if (flights.length === 0) {
    log.info("No flights found", { alertId });
    if (redis) await writeResult(redis, alertId, { status: "no_flights" });
    return;
  }

  log.info("Flights found, processing top deals", { alertId, total: flights.length });

  // ─── 2. Tomar las 5 mejores ofertas por precio ─────
  const topFlights = flights.sort((a, b) => a.price - b.price).slice(0, 5);

  // ─── 3. Crear o actualizar deals (evita duplicados y reenvíos en cada ciclo) ─
  // Un mismo vuelo (misma ruta + día de salida) que ya se encontró en un ciclo
  // anterior se actualiza en lugar de crear un registro nuevo. Así una alerta
  // recurrente no acumula filas duplicadas ni reenvía el email de notificación
  // en cada ejecución para la misma oferta. Si el precio bajó desde la última
  // notificación, se permite notificar de nuevo (mejor oferta = nueva noticia).
  const deals = await Promise.all(
    topFlights.map(async (flight) => {
      const departureDate = new Date(flight.departureDate);
      const existing = await prisma.deal.findFirst({
        where: {
          alertId: alert.id,
          origin: flight.origin,
          destination: flight.destination,
          departureDate: { gte: startOfDay(departureDate), lte: endOfDay(departureDate) },
        },
      });

      const data = {
        returnDate: flight.returnDate ? new Date(flight.returnDate) : null,
        airline: flight.airline,
        flightPrice: flight.price,
        flightData: flight.raw,
        flightSource: flight.source,
        bookingUrl: flight.bookingUrl,
        currency: flight.currency,
        status: "PROCESSING" as const,
      };

      if (existing) {
        const priceImproved = flight.price < Number(existing.flightPrice);
        return prisma.deal.update({
          where: { id: existing.id },
          data: { ...data, ...(priceImproved ? { isNotified: false } : {}) },
        });
      }

      return prisma.deal.create({
        data: {
          alertId: alert.id,
          userId: alert.user.id,
          origin: flight.origin,
          destination: flight.destination,
          departureDate,
          ...data,
        },
      });
    })
  );

  // ─── 4-6. Procesar todos los deals en paralelo ─────
  const results = await Promise.allSettled(
    topFlights.map(async (flight, i) => {
      const deal = deals[i];

      try {
        // ─── 4. Buscar hotel ──────────────────────────
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

        const cheapestHotel =
          hotels.length > 0 ? hotels.sort((a, b) => a.price - b.price)[0] : null;

        // ─── 5. Analizar con IA ───────────────────────
        const analysis = await analyzeDealWithAI({
          flight,
          passengers: alert.passengers,
          tripDurationMin: alert.tripDurationMin,
          tripDurationMax: alert.tripDurationMax,
          hotel: cheapestHotel ?? undefined,
        });

        // ─── Actualizar deal con hotel + IA en una sola query ─
        await prisma.deal.update({
          where: { id: deal.id },
          data: {
            ...(cheapestHotel && {
              hotelName: cheapestHotel.name,
              hotelPrice: cheapestHotel.price,
              hotelData: cheapestHotel.raw,
              hotelSource: cheapestHotel.source,
              hotelBookingUrl: cheapestHotel.bookingUrl,
            }),
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

        log.info("Deal processed", { dealId: deal.id, score: analysis.score });

        // ─── 6. Enviar notificación por email ─────────
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

            await prisma.deal.update({ where: { id: deal.id }, data: { isNotified: true } });
            log.info("Notification sent", { dealId: deal.id, route: `${flight.origin}→${flight.destination}` });
          } catch (emailErr) {
            log.error("Failed to send notification", { dealId: deal.id, ...toLogError(emailErr) });
          }
        }
      } catch (err) {
        log.error("Failed to process deal", { dealId: deal.id, ...toLogError(err) });
        await prisma.deal.update({ where: { id: deal.id }, data: { status: "ERROR" } });
      }
    })
  );

  if (redis) {
    const doneCount = results.filter((r) => r.status === "fulfilled").length;
    await writeResult(redis, alertId, { status: "done", dealsCount: doneCount });
    log.info("Alert run complete", { alertId, dealsReady: doneCount, total: topFlights.length });
  }

  // Deactivate one-time alerts after processing completes
  if (alert.frequencyMinutes === 0) {
    await prisma.searchAlert.update({
      where: { id: alert.id },
      data: { isActive: false },
    });
  }
}
