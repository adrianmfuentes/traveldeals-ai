import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { rateLimit, getIdentifier } from "@/lib/rate-limit";
import { createLogger, toLogError } from "@/lib/logger";
import { searchAlertsQueue } from "@/lib/queue";
import { z } from "zod";

const log = createLogger("API:alerts");

const VALID_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD"] as const;

const createAlertSchema = z.object({
  origin: z.string().min(2).max(100),
  destinations: z.array(z.string().min(2).max(100)).min(1).max(10),
  passengers: z.number().int().min(1).max(10).default(1),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  tripDurationMin: z.number().int().min(1).max(365),
  tripDurationMax: z.number().int().min(1).max(365),
  maxBudget: z.number().positive().max(1_000_000).optional(),
  currency: z.enum(VALID_CURRENCIES).default("EUR"),
  frequencyMinutes: z.number().int().min(0).max(10080).default(720), // 0 = one-time search
});

// GET /api/alerts — Listar alertas del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { success, remaining } = await rateLimit(
      getIdentifier(req, session.user.id),
      10,
      60
    );
    if (!success) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Inténtalo en un momento." },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
      );
    }

    const alerts = await prisma.searchAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { deals: true } } },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    log.error("Failed to fetch alerts", toLogError(error));
    return NextResponse.json(
      { error: "Error al obtener las alertas" },
      { status: 500 }
    );
  }
}

// POST /api/alerts — Crear nueva alerta
export async function POST(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { success, remaining } = await rateLimit(
      getIdentifier(req, session.user.id),
      10,
      60
    );
    if (!success) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Inténtalo en un momento." },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
      );
    }

    const body = await req.json();
    const data = createAlertSchema.parse(body);

    const alert = await prisma.searchAlert.create({
      data: {
        userId: session.user.id,
        ...data,
        dateFrom: new Date(data.dateFrom),
        dateTo: new Date(data.dateTo),
        nextRunAt: new Date(),
      },
    });

    // Enqueue immediately — don't wait for the scheduler's next tick
    try {
      await searchAlertsQueue.add(
        `alert-${alert.id}`,
        { alertId: alert.id },
        {
          jobId: `alert-${alert.id}-${Date.now()}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 5_000 },
        }
      );
    } catch (queueErr) {
      log.warn("Failed to enqueue alert immediately", toLogError(queueErr));
    }

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      );
    }
    log.error("Failed to create alert", toLogError(error));
    return NextResponse.json(
      { error: "Error al crear la alerta" },
      { status: 500 }
    );
  }
}
