import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { rateLimit, getIdentifier } from "@/lib/rate-limit";
import { z } from "zod";

const patchAlertSchema = z.object({
  isActive: z.boolean().optional(),
  frequencyMinutes: z.number().int().min(60).optional(),
});

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

    const updated = await prisma.searchAlert.update({
      where: { id },
      data,
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Error updating alert:", error);
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
    console.error("Error deleting alert:", error);
    return NextResponse.json({ error: "Error al eliminar la alerta" }, { status: 500 });
  }
}
