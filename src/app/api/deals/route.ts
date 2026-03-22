import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, getIdentifier } from "@/lib/rate-limit";

// GET /api/deals — Listar ofertas del usuario
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "READY";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const alertId = searchParams.get("alertId");

    const deals = await prisma.deal.findMany({
      where: {
        userId: session.user.id,
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
