import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/deals — Listar ofertas del usuario
export async function GET(req: NextRequest) {
  try {
    // TODO: Obtener userId de la sesión
    const userId = "temp-user-id";

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "READY";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const alertId = searchParams.get("alertId");

    const deals = await prisma.deal.findMany({
      where: {
        userId,
        status: status as any,
        ...(alertId ? { alertId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        alert: {
          select: { origin: true, destinations: true },
        },
      },
    });

    return NextResponse.json({ deals });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      { error: "Error al obtener las ofertas" },
      { status: 500 }
    );
  }
}
