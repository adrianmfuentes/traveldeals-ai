import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { rateLimit, getIdentifier } from "@/lib/rate-limit";
import { createLogger, toLogError } from "@/lib/logger";
import { searchAlertsQueue } from "@/lib/queue";
import { z } from "zod";

const log = createLogger("API:alerts");

const VALID_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD"] as const;

const patchAlertSchema = z
  .object({
    isActive: z.boolean().optional(),
    origin: z.string().min(2).max(100).optional(),
    destinations: z.array(z.string().min(2).max(100)).min(1).max(10).optional(),
    passengers: z.number().int().min(1).max(10).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    tripDurationMin: z.number().int().min(1).max(365).optional(),
    tripDurationMax: z.number().int().min(1).max(365).optional(),
    maxBudget: z.number().positive().max(1_000_000).nullable().optional(),
    currency: z.enum(VALID_CURRENCIES).optional(),
    frequencyMinutes: z.number().int().min(0).max(10080).optional(),
  })
  .refine(
    (data) =>
      !data.dateFrom || !data.dateTo || new Date(data.dateTo) >= new Date(data.dateFrom),
    { message: "dateTo debe ser posterior o igual a dateFrom", path: ["dateTo"] }
  )
  .refine(
    (data) =>
      data.tripDurationMin == null ||
      data.tripDurationMax == null ||
      data.tripDurationMax >= data.tripDurationMin,
    { message: "tripDurationMax debe ser mayor o igual a tripDurationMin", path: ["tripDurationMax"] }
  );

// PATCH /api/alerts/[id] — Actualizar alerta (toggle isActive, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAppSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { success } = await rateLimit(getIdentifier(req, session.user.id), 10, 60);
    if (!success) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Inténtalo en un momento." },
        { status: 429 }
      );
    }

    const alert = await prisma.searchAlert.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    if (alert.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const data = patchAlertSchema.parse(body);

    // Build the DB update, converting date strings and resetting the run timer
    const dbData: Record<string, unknown> = { ...data };
    if (data.dateFrom) dbData.dateFrom = new Date(data.dateFrom);
    if (data.dateTo) dbData.dateTo = new Date(data.dateTo);

    const isSearchUpdate =
      data.origin !== undefined ||
      data.destinations !== undefined ||
      data.dateFrom !== undefined ||
      data.dateTo !== undefined ||
      data.passengers !== undefined ||
      data.tripDurationMin !== undefined ||
      data.tripDurationMax !== undefined ||
      data.maxBudget !== undefined ||
      data.currency !== undefined;

    if (isSearchUpdate) {
      dbData.nextRunAt = new Date();
      // Delete stale deals so the UI shows a clean slate for the new search
      await prisma.deal.deleteMany({ where: { alertId: id } });
    }

    const updated = await prisma.searchAlert.update({
      where: { id },
      data: dbData,
    });

    // Enqueue immediately when search parameters were changed
    if (isSearchUpdate) {
      try {
        await searchAlertsQueue.add(
          `alert-${id}`,
          { alertId: id },
          {
            jobId: `alert-${id}-${Date.now()}`,
            attempts: 3,
            backoff: { type: "exponential", delay: 5_000 },
          }
        );
      } catch (queueErr) {
        log.warn("Failed to enqueue alert after edit", toLogError(queueErr));
      }
    }

    return NextResponse.json({ alert: updated, enqueued: isSearchUpdate });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      );
    }
    log.error("Failed to update alert", toLogError(error));
    return NextResponse.json({ error: "Error al actualizar la alerta" }, { status: 500 });
  }
}

// DELETE /api/alerts/[id] — Eliminar alerta
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAppSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { success } = await rateLimit(getIdentifier(req, session.user.id), 10, 60);
    if (!success) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Inténtalo en un momento." },
        { status: 429 }
      );
    }

    const alert = await prisma.searchAlert.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    if (alert.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.searchAlert.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to delete alert", toLogError(error));
    return NextResponse.json({ error: "Error al eliminar la alerta" }, { status: 500 });
  }
}
