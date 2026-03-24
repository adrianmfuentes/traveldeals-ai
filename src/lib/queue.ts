import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

declare global {
  // eslint-disable-next-line no-var
  var __searchAlertsQueue: Queue | undefined;
}

function getSearchAlertsQueue(): Queue {
  if (!globalThis.__searchAlertsQueue) {
    globalThis.__searchAlertsQueue = new Queue("search-alerts", {
      connection: redis,
    });
  }
  return globalThis.__searchAlertsQueue;
}

export const searchAlertsQueue = getSearchAlertsQueue();
