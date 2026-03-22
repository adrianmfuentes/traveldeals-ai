# TravelDeals AI — Production Deployment Guide (Docker)

## Prerequisites

- Docker 24+ and Docker Compose v2 installed on the server
- A domain name pointing to your server (for HTTPS)
- Ports 80 and 443 open (if using a reverse proxy)

---

## 1. Prepare the server

```bash
# Clone the repo
git clone <repo-url> /opt/traveldeals
cd /opt/traveldeals
```

---

## 2. Configure environment variables

```bash
cp .env.example .env
chmod 600 .env   # owner-only access
```

Edit `.env` and fill in all values:

```env
# Database (used internally — no external exposure needed)
POSTGRES_USER=traveldeals
POSTGRES_PASSWORD=<strong-random-password>

# Redis
REDIS_PASSWORD=<strong-random-password>

# App
APP_PORT=3000
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# AI & search
GROQ_API_KEY=gsk_...
SERPAPI_API_KEY=...

# Email (optional)
RESEND_API_KEY=re_...
```

> Generate a strong secret: `openssl rand -base64 32`

---

## 3. Build and start

```bash
# Build all images
docker compose build

# Start in background (runs migrations automatically)
docker compose --env-file .env up -d

# Watch logs
docker compose logs -f
```

Services started:
| Service | Description |
|---|---|
| `postgres` | PostgreSQL 16 database |
| `redis` | Redis 7 queue + cache |
| `migrate` | Runs `prisma migrate deploy` once, then exits |
| `app` | Next.js on port 3000 |
| `worker` | Background search + AI worker |

---

## 4. Set up a reverse proxy (Nginx + HTTPS)

Install Nginx and Certbot:

```bash
apt install nginx certbot python3-certbot-nginx -y
```

Create `/etc/nginx/sites-available/traveldeals`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and get SSL:

```bash
ln -s /etc/nginx/sites-available/traveldeals /etc/nginx/sites-enabled/
certbot --nginx -d yourdomain.com
systemctl reload nginx
```

---

## 5. Verify deployment

```bash
# Check all containers are healthy
docker compose ps

# Hit the health endpoint
curl https://yourdomain.com/api/health
# → {"status":"ok","timestamp":"..."}

# Run security checks against the running environment
npm run security:check
```

---

## 6. Updates & zero-downtime deploys

```bash
git pull

# Rebuild and restart (Docker Compose handles the migration step)
docker compose build
docker compose up -d --no-deps app worker

# Verify
docker compose ps
```

---

## 7. Backups

### PostgreSQL

```bash
# Dump
docker compose exec postgres pg_dump -U traveldeals traveldeals > backup-$(date +%Y%m%d).sql

# Restore
cat backup-20250101.sql | docker compose exec -T postgres psql -U traveldeals traveldeals
```

Automate with a daily cron:

```bash
# /etc/cron.d/traveldeals-backup
0 2 * * * root cd /opt/traveldeals && docker compose exec -T postgres \
  pg_dump -U traveldeals traveldeals > /opt/backups/db-$(date +\%Y\%m\%d).sql
```

### Redis

Redis data is persisted via Docker volumes. To back it up:

```bash
docker run --rm -v traveldeals_redis_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/redis-$(date +%Y%m%d).tar.gz /data
```

---

## 8. Monitoring

```bash
# Real-time resource usage
docker stats

# Worker job logs
docker compose logs -f worker

# App error logs
docker compose logs -f app
```

---

## 9. Useful commands

```bash
# Open a Prisma Studio session (dev only)
docker compose exec app npx prisma studio

# Run a one-off command inside the app container
docker compose exec app node -e "console.log('hello')"

# Stop everything
docker compose down

# Stop and delete all data (irreversible!)
docker compose down -v
```

---

## Environment variable reference

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_USER` | Yes | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `REDIS_PASSWORD` | Yes | Redis password |
| `APP_PORT` | No | Host port to expose (default: 3000) |
| `NEXTAUTH_URL` | Yes | Full public URL (e.g. `https://yourdomain.com`) |
| `NEXTAUTH_SECRET` | Yes | Random string ≥ 32 chars |
| `GROQ_API_KEY` | Yes | Groq API key |
| `SERPAPI_API_KEY` | Yes | SerpApi key |
| `RESEND_API_KEY` | No | Resend key for email notifications |
