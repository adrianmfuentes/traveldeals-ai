import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { processSearchAlert } from "./jobs/search-alert.job";

const QUEUE_NAME = "search-alerts";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// ─── Cola ────────────────────────────────────────────
export const searchQueue = new Queue(QUEUE_NAME, { connection });

// ─── Worker ──────────────────────────────────────────
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`[Worker] Procesando job ${job.id} — alerta: ${job.data.alertId}`);
    await processSearchAlert(job.data.alertId);
  },
  {
    connection,
    concurrency: 3, // Máximo 3 alertas en paralelo
    limiter: {
      max: 10,
      duration: 60_000, // Máximo 10 jobs por minuto (respeta rate limits de APIs)
    },
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] ✅ Job ${job.id} completado`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} falló:`, err.message);
});

// ─── Scheduler: revisa alertas pendientes cada minuto ─
async function scheduleAlerts() {
  // Importar Prisma aquí para evitar problemas de inicialización
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  console.log("[Scheduler] Buscando alertas pendientes...");

  const now = new Date();
  const dueAlerts = await prisma.searchAlert.findMany({
    where: {
      isActive: true,
      OR: [
        { nextRunAt: { lte: now } },
        { nextRunAt: null },
      ],
    },
    select: { id: true, frequencyMinutes: true },
  });

  console.log(`[Scheduler] Encontradas ${dueAlerts.length} alertas pendientes`);

  for (const alert of dueAlerts) {
    await searchQueue.add(
      `alert-${alert.id}`,
      { alertId: alert.id },
      {
        jobId: `alert-${alert.id}-${Date.now()}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
      }
    );

    // Actualizar nextRunAt
    const nextRun = new Date(now.getTime() + alert.frequencyMinutes * 60_000);
    await prisma.searchAlert.update({
      where: { id: alert.id },
      data: { lastRunAt: now, nextRunAt: nextRun },
    });
  }

  await prisma.$disconnect();
}

// Ejecutar scheduler cada 60 segundos
setInterval(scheduleAlerts, 60_000);

// Ejecutar una vez al arrancar
scheduleAlerts();

console.log("🚀 Worker iniciado y escuchando jobs...");
