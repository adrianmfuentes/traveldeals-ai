import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createLogger, toLogError } from "@/lib/logger";
import { hashResetToken } from "@/lib/password-reset";

const log = createLogger("API:auth");

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres")
    .max(128)
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { success } = await rateLimit(`reset-password:${ip}`, 10, 900);
  if (!success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera 15 minutos." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const tokenHash = hashResetToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: "El enlace no es válido o ha caducado." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      // Mark this token used and invalidate any other outstanding tokens
      // for the account so an older leaked link can't be replayed.
      prisma.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    log.info("Password reset completed", { userId: resetToken.userId });

    return NextResponse.json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      );
    }
    log.error("Reset-password request failed", toLogError(error));
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
