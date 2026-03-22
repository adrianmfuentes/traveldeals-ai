# TravelDeals AI — Architecture

## Overview

SaaS platform that automatically monitors flights and hotels, processes results with AI, and presents complete travel packages: flight + accommodation + budget + itinerary.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + TypeScript |
| Backend API | Next.js Route Handlers |
| Background worker | BullMQ + Redis (separate Node process) |
| Database | PostgreSQL + Prisma ORM |
| AI analysis | Groq API |
| Flight + hotel search | SerpApi (Google Flights, Google Hotels) |
| Authentication | NextAuth.js (JWT strategy, credentials provider) |
| i18n | next-intl (English, Spanish, French) |
| Dark mode | next-themes (light / dark / system) |
| Email | Resend |

---

## Project structure

```
traveldeals-ai/
├── src/                              # Next.js app (frontend + API)
│   ├── app/
│   │   ├── [locale]/                 # Locale-prefixed routes (es, en, fr)
│   │   │   ├── layout.tsx            # Locale layout (ThemeProvider + NextIntlClientProvider)
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── (auth)/               # Login + Register pages
│   │   │   └── (dashboard)/          # Protected dashboard
│   │   │       ├── layout.tsx        # Nav header + auth guard
│   │   │       └── dashboard/        # Main dashboard page
│   │   ├── api/                      # Route handlers (no locale prefix)
│   │   │   ├── auth/                 # NextAuth + register endpoint
│   │   │   ├── alerts/               # CRUD for search alerts
│   │   │   └── deals/                # List found deals
│   │   └── layout.tsx                # Root layout (SessionProvider)
│   ├── components/
│   │   ├── dashboard/                # Dashboard-specific components
│   │   │   ├── AlertsSection.tsx     # Alert list + create button
│   │   │   ├── AlertCard.tsx         # Single alert card
│   │   │   ├── AlertForm.tsx         # Create alert modal
│   │   │   ├── DealsSection.tsx      # Deals grid
│   │   │   ├── DealCard.tsx          # Single deal card
│   │   │   ├── DealDetail.tsx        # Deal detail modal
│   │   │   └── DashboardNav.tsx      # Top nav links
│   │   ├── LanguageSwitcher.tsx      # EN / ES / FR switcher
│   │   ├── ThemeToggle.tsx           # Light / dark / system toggle
│   │   ├── ThemeProvider.tsx         # next-themes wrapper
│   │   ├── SignOutButton.tsx          # Client-side sign-out
│   │   └── SessionProvider.tsx       # NextAuth session wrapper
│   ├── i18n/
│   │   ├── routing.ts                # Locale definitions
│   │   ├── request.ts                # Server-side message loader
│   │   └── navigation.ts             # Locale-aware Link / useRouter
│   ├── lib/
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── prisma.ts                 # Prisma singleton
│   │   ├── redis.ts                  # Redis singleton
│   │   ├── env.ts                    # Zod env validation
│   │   └── rate-limit.ts             # Redis sliding-window rate limiter
│   └── types/
│       └── index.ts                  # Shared TypeScript types (FlightOffer, HotelOffer, etc.)
├── worker/                           # Background worker (separate process)
│   └── src/
│       ├── index.ts                  # BullMQ worker + scheduler (runs every 60s)
│       ├── jobs/
│       │   └── search-alert.job.ts   # Main job: search → AI → save deal → email
│       ├── providers/
│       │   ├── flight-provider.ts    # SerpApi Google Flights
│       │   └── hotel-provider.ts     # SerpApi Google Hotels
│       ├── services/
│       │   ├── ai-analyzer.ts        # Groq AI deal analysis + itinerary
│       │   └── email.ts              # Resend email notifications
│       └── lib/
│           ├── city-airports.ts      # City name → IATA codes resolver (ES/EN/FR)
│           └── circuit-breaker.ts    # Circuit breaker for external APIs
├── messages/                         # i18n translation files
│   ├── en.json
│   ├── es.json
│   └── fr.json
├── prisma/
│   └── schema.prisma                 # Database schema
└── .env.example                      # Required environment variables
```

---

## Data flow

### 1. Alert creation
User fills the form → `POST /api/alerts` → saved in PostgreSQL with `nextRunAt = now()`.

### 2. Scheduler (worker)
Runs every 60 seconds. Finds all active alerts where `nextRunAt ≤ now`, enqueues a BullMQ job for each, and updates `nextRunAt = now + frequencyMinutes`.

### 3. Job processing (`search-alert.job.ts`)
1. Resolve city names to IATA codes (`city-airports.ts`)
2. Search flights via SerpApi Google Flights
3. Search hotels via SerpApi Google Hotels
4. For each of the top 5 cheapest flights: create a `Deal` record, run AI analysis (Groq), save results, optionally send email if score ≥ 70

### 4. Dashboard
User visits `/es/dashboard` → server fetches stats + renders `AlertsSection` + `DealsSection` → client components poll their own data via fetch.

---

## Data models

### User
```
id | email | name | passwordHash | createdAt | updatedAt
```

### SearchAlert
```
id | userId | origin | destinations[] | passengers | dateFrom | dateTo
   | tripDurationMin | tripDurationMax | maxBudget | currency
   | frequencyMinutes | isActive | lastRunAt | nextRunAt
```

### Deal
```
id | alertId | userId | origin | destination | departureDate | returnDate
   | airline | flightPrice | flightData (JSON) | flightSource | bookingUrl
   | hotelName | hotelPrice | hotelData (JSON) | hotelSource | hotelBookingUrl
   | aiProcessed | aiSummary | aiBudget (JSON) | aiItinerary (JSON) | aiScore
   | totalEstimate | status | isNotified | currency
```

---

## Design patterns

- **Provider pattern** — flight/hotel providers implement a common interface, allowing multiple sources to run in parallel via `Promise.allSettled` with deduplication
- **Circuit breaker** — if a provider fails repeatedly it is temporarily disabled
- **JSONB fields** — raw API responses stored as JSON so deals can be re-processed without re-calling APIs
- **Zod validation** — all API inputs and environment variables validated at the boundary
- **Sliding-window rate limiting** — Redis sorted sets used for per-user rate limiting on all API routes
- **City name resolution** — `city-airports.ts` maps city names in EN/ES/FR to IATA codes, with Spanish aliases for all major cities

---

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT sessions, 8-hour expiry, `httpOnly` + `SameSite=lax` cookies
- `NEXTAUTH_SECRET` enforced to be ≥ 32 characters at startup
- Rate limiting on all API routes (10 req/60s per user) and registration (5 req/15min per IP)
- Registration does not reveal whether an email already exists (anti-enumeration)
- Security headers on all routes: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, `Strict-Transport-Security` (production)
- Middleware enforces authentication on all `/dashboard` routes

---

## i18n routing

| URL | Description |
|---|---|
| `/` | Redirects to `/es/` |
| `/es/` | Landing page (Spanish) |
| `/en/` | Landing page (English) |
| `/fr/` | Landing page (French) |
| `/es/login` | Login |
| `/es/dashboard` | Dashboard |

Default locale is `es`. Locale is preserved when switching language.

---

## Pending / roadmap

- [ ] Email verification on registration
- [ ] OAuth providers (Google, GitHub)
- [ ] More flight/hotel providers
- [ ] Push notifications (Web Push)
- [ ] Unit and integration tests
- [ ] Multi-city trip support
