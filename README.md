# ✈️ TravelDeals AI

Plataforma automatizada que busca chollos de viajes y genera itinerarios completos con IA.

## Requisitos previos

- **Node.js** 18+
- **PostgreSQL** 15+
- **Redis** 7+
- Al menos una API key de proveedor de vuelos (Amadeus o Kiwi)
- API key de Anthropic

## Inicio rápido

```bash
# 1. Clonar e instalar
git clone <tu-repo>
cd traveldeals-ai
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Inicializar la base de datos
npm run db:push
npm run db:generate

# 4. Arrancar en desarrollo (2 terminales)
npm run dev          # Terminal 1: Next.js
npm run worker:dev   # Terminal 2: Worker de búsquedas
```

La app estará disponible en `http://localhost:3000`.

## Arquitectura

```
Usuario → Dashboard (Next.js) → API Routes → PostgreSQL
                                                  ↑
Scheduler (cada 60s) → BullMQ/Redis → Worker → APIs de vuelos
                                         ↓
                                    Claude API (análisis IA)
                                         ↓
                                    PostgreSQL (deals)
```

## Documentación

Consulta `CLAUDE.md` para detalles técnicos del proyecto.
