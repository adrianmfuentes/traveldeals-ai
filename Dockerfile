# =============================================================================
# TravelDeals AI — Next.js app
# Multi-stage build for minimal production image
# Build context must be the parent directory containing both
# traveldeals-ai/ and platform-core/ as siblings.
# =============================================================================

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# platform-core must be at /platform-core so that the file:../platform-core
# reference in package.json resolves correctly from /app
COPY platform-core/ /platform-core/
COPY traveldeals-ai/package.json traveldeals-ai/package-lock.json* ./
COPY traveldeals-ai/prisma ./prisma/

RUN npm ci --ignore-scripts
RUN npx prisma generate

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /platform-core/ /platform-core/
COPY --from=deps /app/node_modules ./node_modules
COPY traveldeals-ai/ .

# Symlink app node_modules into platform-core so TypeScript can resolve
# packages (next-auth, bcryptjs, etc.) when type-checking platform-core files
RUN ln -s /app/node_modules /platform-core/node_modules

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build requires dummy values for env validation at build time
# Real values are injected at runtime via docker-compose / secrets
ARG NEXTAUTH_SECRET=build-time-placeholder-32-characters
ARG NEXTAUTH_URL=http://localhost:3000
ARG DATABASE_URL=postgresql://placeholder:placeholder@placeholder/placeholder
ARG GROQ_API_KEY=build-placeholder
ARG SERPAPI_API_KEY=build-placeholder

ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV DATABASE_URL=$DATABASE_URL
ENV GROQ_API_KEY=$GROQ_API_KEY
ENV SERPAPI_API_KEY=$SERPAPI_API_KEY

RUN npm run build
RUN mkdir -p /app/public

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
RUN mkdir -p node_modules/.bin && \
    ln -sf ../prisma/build/index.js node_modules/.bin/prisma && \
    chmod +x node_modules/prisma/build/index.js

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run DB migrations then start the app
CMD ["node", "server.js"]
