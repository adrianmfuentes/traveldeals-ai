import "dotenv/config";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createWorker, createScheduler } from "@platform/core/worker";
import { createLogger } from "@platform/core/lib/logger";
import { processSearchAlert } from "./jobs/search-alert.job";

const log = createLogger("Worker");

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const { queue } = createWorker({
  queueName: "search-alerts",
  connection,
  handler: async (data: { alertId: string }) => {
    await processSearchAlert(data.alertId, connection);
  },
});

createScheduler({
  queue,
  intervalMs: 60_000,
  findDueItems: async () => {
    const now = new Date();
    return prisma.searchAlert.findMany({
      where: {
        isActive: true,
        OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }],
      },
      select: { id: true, frequencyMinutes: true },
    });
  },
  buildJob: (alert) => ({
    name: `alert-${alert.id}`,
    data: { alertId: alert.id },
    jobId: `alert-${alert.id}-${Date.now()}`,
  }),
  onEnqueued: async (alert) => {
    const now = new Date();
    if (alert.frequencyMinutes === 0) {
      // One-time search: push nextRunAt far in the future so the scheduler
      // won't re-queue it. isActive is kept true so the job can run;
      // the job itself will set isActive: false once it finishes.
      await prisma.searchAlert.update({
        where: { id: alert.id },
        data: { lastRunAt: now, nextRunAt: new Date("2099-01-01") },
      });
    } else {
      const nextRun = new Date(now.getTime() + alert.frequencyMinutes * 60_000);
      await prisma.searchAlert.update({
        where: { id: alert.id },
        data: { lastRunAt: now, nextRunAt: nextRun },
      });
    }
  },
});

log.info("Worker started", { queue: "search-alerts" });
