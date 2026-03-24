import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { rateLimit, getIdentifier } from "@/lib/rate-limit";
import { createLogger, toLogError } from "@/lib/logger";

const log = createLogger("API:deals");

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
    const PAGE_SIZE = 4;
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0") || 0);
    const alertId = searchParams.get("alertId");

    const where = {
      userId: session.user.id,
      status,
      ...(alertId ? { alertId } : {}),
    };

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: offset,
        include: {
          alert: {
            select: { origin: true, destinations: true },
          },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    return NextResponse.json({ deals, total });
  } catch (error) {
    log.error("Failed to fetch deals", toLogError(error));
    return NextResponse.json(
      { error: "Error al obtener las ofertas" },
      { status: 500 }
    );
  }
}
