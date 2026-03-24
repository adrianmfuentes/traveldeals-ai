import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { createLogger, toLogError } from "@/lib/logger";

const log = createLogger("API:user");

// DELETE /api/user — Permanently delete authenticated user and all their data
export async function DELETE() {
  const session = await getAppSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
    log.info("User account deleted", { userId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to delete user account", toLogError(error));
    return NextResponse.json({ error: "Error al eliminar la cuenta" }, { status: 500 });
  }
}
