# TravelDeals AI

## Descripción

Plataforma SaaS que busca chollos de viajes automáticamente, los procesa con IA (Anthropic Claude) y presenta paquetes completos: vuelo + alojamiento + presupuesto + itinerario.

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **Backend API**: Next.js Route Handlers
- **Worker**: Proceso separado con BullMQ + Redis para jobs de búsqueda
- **Base de datos**: PostgreSQL + Prisma ORM
- **IA**: Anthropic Claude API (Sonnet) para análisis de ofertas e itinerarios
- **Proveedores de vuelos**: SerpApi (Google Flights)

## Estructura del proyecto

```
traveldeals-ai/
├── src/                        # Código Next.js (frontend + API)
│   ├── app/                    # App Router pages y API routes
│   │   ├── (dashboard)/        # Grupo de rutas del dashboard
│   │   └── api/                # Route handlers (alerts, deals, auth)
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes base reutilizables
│   │   └── dashboard/          # Componentes específicos del dashboard
│   ├── lib/                    # Utilidades compartidas
│   │   ├── prisma.ts           # Singleton de Prisma
│   │   ├── redis.ts            # Singleton de Redis
│   │   ├── env.ts              # Validación de env vars con Zod
│   │   ├── providers/          # Clientes de APIs de viajes (para uso en API routes)
│   │   └── ai/                 # Utilidades de IA (para uso en API routes)
│   └── types/                  # Tipos TypeScript compartidos
├── worker/                     # Proceso worker independiente
│   ├── src/
│   │   ├── index.ts            # Entry point: BullMQ worker + scheduler
│   │   ├── jobs/               # Procesadores de jobs
│   │   ├── providers/          # Proveedores de vuelos (SerpApi)
│   │   └── services/           # Servicios (AI analyzer)
│   └── tsconfig.json
├── prisma/
│   └── schema.prisma           # Esquema de base de datos
├── docs/                       # Documentación del proyecto
└── .env.example                # Variables de entorno requeridas
```

## Comandos principales

```bash
npm run dev              # Arrancar Next.js en modo desarrollo
npm run worker:dev       # Arrancar el worker con hot reload
npm run db:generate      # Generar Prisma Client
npm run db:push          # Sincronizar esquema con la BD (dev)
npm run db:migrate       # Crear migración (producción)
npm run db:studio        # Abrir Prisma Studio (GUI de la BD)
npm run build            # Build de producción
npm run lint             # Ejecutar ESLint
```

## Variables de entorno

Copiar `.env.example` a `.env` y rellenar:

- `DATABASE_URL` — Conexión PostgreSQL
- `REDIS_URL` — Conexión Redis
- `ANTHROPIC_API_KEY` — API key de Anthropic (obligatoria)
- `SERPAPI_API_KEY` — SerpApi para Google Flights (obligatoria)

## Modelos de datos clave

- **User**: Usuarios de la plataforma
- **SearchAlert**: Alertas recurrentes configuradas por el usuario (origen, destino, fechas, frecuencia)
- **Deal**: Ofertas encontradas, con datos del vuelo crudos + análisis de IA (summary, budget, itinerary, score)

## Patrones de diseño

- **Provider Pattern**: Los proveedores de vuelos implementan una interfaz común (`FlightProvider`). Se ejecutan en paralelo con `Promise.allSettled` y se deduplican resultados.
- **Circuit Breaker (futuro)**: Si un proveedor falla repetidamente, se desactiva temporalmente.
- **Campos JSONB**: Los datos crudos de vuelos/hoteles y las respuestas de IA se guardan como JSON en PostgreSQL para poder re-procesar sin re-llamar APIs.
- **Validación con Zod**: Inputs de API y variables de entorno se validan con Zod.

## Convenciones de código

- TypeScript estricto (`strict: true`)
- Imports con alias `@/*` apuntando a `src/*`
- Nombres de archivos en kebab-case
- Componentes React en PascalCase
- API routes usan los handlers nativos de Next.js (`GET`, `POST`, etc.)
- El worker usa `tsx` para ejecutar TypeScript directamente

## Estado actual / TODOs

- [ ] Implementar autenticación (NextAuth o Lucia Auth)
- [ ] Completar UI del dashboard (crear alerta, ver ofertas)
- [ ] Añadir proveedor SerpApi (Google Flights)
- [ ] Añadir búsqueda de hoteles (Booking Affiliate API)
- [ ] Notificaciones por email cuando se encuentre un chollo
- [ ] Tests unitarios y de integración
- [ ] Rate limiting en API routes
- [ ] Circuit breaker para proveedores
