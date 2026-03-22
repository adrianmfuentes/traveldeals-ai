import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, getIdentifier } from "@/lib/rate-limit";
import { z } from "zod";

const createAlertSchema = z.object({
  origin: z.string().length(3, "Debe ser un código IATA de 3 letras"),
  destinations: z.array(z.string().length(3)).default([]),
  passengers: z.number().int().min(1).max(10).default(1),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  tripDurationMin: z.number().int().min(1).optional(),
  tripDurationMax: z.number().int().min(1).optional(),
  maxBudget: z.number().positive().optional(),
  currency: z.string().length(3).default("EUR"),
  frequencyMinutes: z.number().int().min(60).default(720),
});

// GET /api/alerts — Listar alertas del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Error al obtener las alertas" },
      { status: 500 }
    );
  }
}

// POST /api/alerts — Crear nueva alerta
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Error creating alert:", error);
    return NextResponse.json(
      { error: "Error al crear la alerta" },
      { status: 500 }
    );
  }
}
