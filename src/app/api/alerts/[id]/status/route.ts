import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { createLogger, toLogError } from "@/lib/logger";

const log = createLogger("API:alerts");

// GET /api/alerts/[id]/status — Poll the result of the last worker run
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getAppSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const alert = await prisma.searchAlert.findUnique({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!alert) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    const raw = await redis.get(`alert:result:${id}`);
    if (!raw) return NextResponse.json({ status: "pending" });

    return NextResponse.json(JSON.parse(raw));
  } catch (error) {
    log.error("Failed to fetch alert status", toLogError(error));
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
