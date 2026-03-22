# TravelDeals AI

Automated travel deal platform that monitors flights and hotels 24/7, analyzes them with AI, and delivers complete packages: flight + accommodation + budget breakdown + day-by-day itinerary.

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 15+ (or [Neon](https://neon.tech) free tier)
- **Redis** 7+ (or [Upstash](https://upstash.com) free tier)
- **SerpApi** key — for Google Flights + Google Hotels search
- **Groq** API key — for AI analysis
- **NEXTAUTH_SECRET** — at least 32 characters (`openssl rand -base64 32`)

## Quick start

```bash
# 1. Clone and install
git clone <repo-url>
cd traveldeals-ai
npm install

# 2. Configure environment variables
cp .env.example .env
# Fill in .env with your credentials

# 3. Initialize the database
npm run db:push
npm run db:generate

# 4. Start development (2 terminals)
npm run dev          # Terminal 1: Next.js app
npm run worker:dev   # Terminal 2: Background search worker
```

App available at `http://localhost:3000` (redirects to `/es/` by default).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `GROQ_API_KEY` | Yes | Groq API key for AI analysis |
| `SERPAPI_API_KEY` | Yes | SerpApi key (Google Flights + Hotels) |
| `NEXTAUTH_SECRET` | Yes | Random secret ≥ 32 chars |
| `NEXTAUTH_URL` | Yes | App URL (e.g. `http://localhost:3000`) |
| `RESEND_API_KEY` | No | Resend key for email notifications |

## Key commands

```bash
npm run dev              # Start Next.js in development mode
npm run worker:dev       # Start the worker with hot reload
npm run db:generate      # Generate Prisma Client
npm run db:push          # Sync schema with DB (dev)
npm run db:migrate       # Create migration (production)
npm run db:studio        # Open Prisma Studio (DB GUI)
npm run build            # Production build
npm run lint             # Run ESLint
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full technical documentation.

```
Browser → Next.js ([locale]/dashboard) → API Routes → PostgreSQL
                                                           ↑
Scheduler (every 60s) → BullMQ/Redis → Worker → SerpApi (Flights + Hotels)
                                          ↓
                                      Groq AI (analysis + itinerary)
                                          ↓
                                      PostgreSQL (deals)
                                          ↓
                                      Resend (email notification)
```
