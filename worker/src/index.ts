import "dotenv/config";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { createWorker, createScheduler } from "@platform/core/worker";
import { processSearchAlert } from "./jobs/search-alert.job";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const prisma = new PrismaClient();

const { queue } = createWorker({
  queueName: "search-alerts",
  connection,
  handler: async (data: { alertId: string }) => {
    console.log(`[Worker] Processing alert: ${data.alertId}`);
    await processSearchAlert(data.alertId);
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
    const nextRun = new Date(now.getTime() + alert.frequencyMinutes * 60_000);
    await prisma.searchAlert.update({
      where: { id: alert.id },
      data: { lastRunAt: now, nextRunAt: nextRun },
    });
  },
});

console.log("🚀 Worker started and listening for jobs...");
