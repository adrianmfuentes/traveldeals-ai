import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { rateLimit, getIdentifier } from "@/lib/rate-limit";

// GET /api/deals — Listar ofertas del usuario
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

    const { searchParams } = new URL(req.url);
    const VALID_STATUSES = ["READY", "PROCESSING", "ERROR"] as const;
    type DealStatus = typeof VALID_STATUSES[number];
    const rawStatus = searchParams.get("status") ?? "READY";
    const status: DealStatus = VALID_STATUSES.includes(rawStatus as DealStatus)
      ? (rawStatus as DealStatus)
      : "READY";
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "20") || 20), 50);
    const alertId = searchParams.get("alertId");

    const deals = await prisma.deal.findMany({
      where: {
        userId: session.user.id,
        status,
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
