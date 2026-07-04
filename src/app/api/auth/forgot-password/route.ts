import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createLogger, toLogError } from "@/lib/logger";
import { generateResetToken, RESET_TOKEN_TTL_MINUTES } from "@/lib/password-reset";
import { sendEmail } from "@platform/core/lib/email";
import { routing } from "@/i18n/routing";

const log = createLogger("API:auth");

const forgotPasswordSchema = z.object({
  email: z.string().email().max(254),
  locale: z.enum(["en", "es", "fr"]).default(routing.defaultLocale as "es"),
});

const GENERIC_MESSAGE =
  "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.";

export async function POST(req: NextRequest) {
  // IP-based rate limit: 5 requests per 15 minutes, same policy as registration
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { success } = await rateLimit(`forgot-password:${ip}`, 5, 900);
  if (!success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera 15 minutos." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { email, locale } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true },
    });

    // Always respond the same way whether or not the account exists,
    // and only do the extra work (token + email) when it does.
    if (user) {
      const { token, tokenHash } = generateResetToken();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetUrl = `${appUrl}/${locale}/reset-password?token=${token}`;

      try {
        await sendEmail({
          from: "TravelDeals AI <noreply@traveldeals.ai>",
          to: user.email,
          subject: "Restablece tu contraseña — TravelDeals AI",
          html: `
            <p>Hola${user.name ? ` ${user.name}` : ""},</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Este enlace caduca en ${RESET_TOKEN_TTL_MINUTES} minutos:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>Si no has solicitado esto, puedes ignorar este correo.</p>
          `,
          text: `Restablece tu contraseña: ${resetUrl} (caduca en ${RESET_TOKEN_TTL_MINUTES} minutos). Si no has solicitado esto, ignora este correo.`,
        });
      } catch (emailErr) {
        log.error("Failed to send password reset email", toLogError(emailErr));
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      );
    }
    log.error("Forgot-password request failed", toLogError(error));
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
