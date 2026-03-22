import { createMiddleware } from "@platform/core/i18n/middleware";
import { routing } from "@/i18n/routing";

export const { middleware, config } = createMiddleware({ routing });
