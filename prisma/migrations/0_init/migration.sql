-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'EXPIRED', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destinations" TEXT[],
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "tripDurationMin" INTEGER,
    "tripDurationMax" INTEGER,
    "maxBudget" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "frequencyMinutes" INTEGER NOT NULL DEFAULT 720,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "airline" TEXT,
    "flightPrice" DECIMAL(10,2) NOT NULL,
    "flightData" JSONB NOT NULL,
    "flightSource" TEXT NOT NULL,
    "bookingUrl" TEXT,
    "hotelName" TEXT,
    "hotelPrice" DECIMAL(10,2),
    "hotelData" JSONB,
    "hotelSource" TEXT,
    "hotelBookingUrl" TEXT,
    "aiProcessed" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "aiBudget" JSONB,
    "aiItinerary" JSONB,
    "aiScore" DOUBLE PRECISION,
    "aiRawResponse" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalEstimate" DECIMAL(10,2),
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "status" "DealStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "search_alerts_isActive_nextRunAt_idx" ON "search_alerts"("isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "search_alerts_userId_idx" ON "search_alerts"("userId");

-- CreateIndex
CREATE INDEX "deals_userId_createdAt_idx" ON "deals"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "deals_alertId_createdAt_idx" ON "deals"("alertId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "deals_status_idx" ON "deals"("status");

-- AddForeignKey
ALTER TABLE "search_alerts" ADD CONSTRAINT "search_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "search_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
