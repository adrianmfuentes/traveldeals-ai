import { redis } from "@/lib/redis";

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowSecs: number = 60
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  const window = windowSecs * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, now - window);
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  pipeline.zcard(key);
  pipeline.expire(key, windowSecs);
  const results = await pipeline.exec();

  const count = (results?.[2]?.[1] as number) ?? 0;
  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}

export function getIdentifier(req: Request, userId?: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return userId ? `user:${userId}` : `ip:${ip}`;
}
