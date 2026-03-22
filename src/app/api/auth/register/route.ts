import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  email: z.string().email("Email inválido").max(254),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres")
    .max(128)
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  // IP-based rate limit: 5 registration attempts per 15 minutes
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { success } = await rateLimit(`register:${ip}`, 5, 900);
  if (!success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera 15 minutos." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      // Return 200 with the same message to prevent email enumeration
      return NextResponse.json(
        { message: "Si el email es válido, recibirás un correo de confirmación." },
        { status: 200 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name ?? null,
        passwordHash,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { message: "Cuenta creada correctamente." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Error en registro:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
