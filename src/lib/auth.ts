import { createAuthOptions } from "@platform/core/auth";
import { prisma } from "@/lib/prisma";

export const authOptions = createAuthOptions(prisma);
