import { rateLimit as coreRateLimit, getIdentifier } from "@platform/core/lib/rate-limit";
import { redis } from "@/lib/redis";

export { getIdentifier };

export function rateLimit(
  identifier: string,
  limit?: number,
  windowSecs?: number
) {
  return coreRateLimit(redis, identifier, limit, windowSecs);
}
