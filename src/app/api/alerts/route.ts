import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
export async function GET() {
  try {
    // TODO: Obtener userId de la sesión
    const userId = "temp-user-id";

    const alerts = await prisma.searchAlert.findMany({
      where: { userId },
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
    // TODO: Obtener userId de la sesión
    const userId = "temp-user-id";

    const body = await req.json();
    const data = createAlertSchema.parse(body);

    const alert = await prisma.searchAlert.create({
      data: {
        userId,
        ...data,
        dateFrom: new Date(data.dateFrom),
        dateTo: new Date(data.dateTo),
        nextRunAt: new Date(), // Ejecutar inmediatamente la primera vez
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
