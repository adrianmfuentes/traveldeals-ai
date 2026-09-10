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

> **Password special characters:** `POSTGRES_PASSWORD` may contain any
> character (`$`, `@`, `:`, `/` …). It is passed to every service as a
> discrete `PGPASSWORD` value, never embedded in a connection-string URL,
> so no percent-encoding is needed. In the `.env` file, write a literal
> `$` as `$$` so Docker Compose does not treat it as a variable reference.

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

## 10. CI/CD deployment (GitHub Actions)

`.github/workflows/deploy.yml` deploys automatically after **Build & Push
Docker Images** succeeds on `master` (or via *Run workflow*).

### Why a single multiplexed SSH connection

The server runs **CrowdSec** with the `ssh-bf` scenario: several SSH
authentications from the same IP in a short window get the source banned,
which previously made the GitHub runner's SSH calls time out mid-deploy.

The workflow now produces **exactly one SSH authentication per deployment**:

1. A **WireGuard** tunnel is brought up first. The tunnel subnet is
   `10.66.66.0/24`: the server is `10.66.66.1` (the deploy target), the CI
   runner peer is `10.66.66.10`. SSH traffic rides the tunnel, so it never
   reaches the public IP that CrowdSec watches.
   **Fail-closed:** if the tunnel does not come up (no handshake), the job
   aborts. There is **no fallback to the public hostname** — ever.
2. The runner's ephemeral `wg0.conf` sets `MTU = 1280` on `[Interface]`
   (prevents SSH from hanging over the tunnel on the runner) and
   `AllowedIPs = 10.66.66.1/32` on `[Peer]` (only the server, no wider route).
3. `known_hosts` is written from the `SERVER_SSH_KNOWN_HOSTS` secret —
   `ssh-keyscan` is gone and `StrictHostKeyChecking` stays `yes`. Because the
   SSH `HostName` is now `10.66.66.1`, that secret **must** contain the
   `ssh-keyscan -p 4422 10.66.66.1` line (keyed by the WireGuard IP), **not**
   the line for the public hostname.
4. One **master connection** is opened (`ssh -Nf deploy-target`) with
   `ControlMaster auto` / `ControlPath ~/.ssh/cm-%r@%h:%p` /
   `ControlPersist 300s`. Every later step (bundle transfer, remote script)
   rides that socket with no re-auth. It is closed in an `if: always()` step
   (`ssh -O exit deploy-target`).
5. Both the `wg-quick up` + first handshake and the master `ssh -Nf` are
   wrapped in a `retry()`: **max 3 attempts, backoff 5 / 15 / 30 s**. This
   only absorbs network flaps or a slow handshake — it does **not** rescue a
   real CrowdSec ban (the tunnel itself is what avoids that).

All remote logic (registry login, `compose pull/down/up`, health-check loop)
lives in the versioned script **`deploy/remote-deploy.sh`**. The compose
file, generated `.env` and that script are shipped in one pipeline:
`tar c … | ssh deploy-target "tar x -C ~/traveldeals-ai"`. Right after the
transfer the runner deletes `stage/` (which held the `.env`); an
`if: always()` step scrubs it again. No secret is ever written to stdout.

### Required GitHub secrets (environment: `production`)

| Secret | Purpose | How to generate |
|---|---|---|
| `SERVER_USER` | SSH login user | — |
| `SERVER_SSH_KEY` | Private key for that user (PEM, full contents) | `ssh-keygen -t ed25519 -f deploy_key` → contents of `deploy_key`; add `deploy_key.pub` to the server's `~/.ssh/authorized_keys` |
| `SERVER_SSH_KNOWN_HOSTS` | `known_hosts` line(s) for the server on port `4422`, **keyed by the WireGuard IP `10.66.66.1`** | On a host already on the VPN (or on the server itself): `ssh-keyscan -p 4422 10.66.66.1` — paste the output verbatim. Do **not** use the public hostname. |
| `WG_PRIVATE_KEY` | WireGuard private key of the runner peer | `wg genkey` — its `wg pubkey` goes as a `[Peer]` on the server's `wg0.conf` |
| `WG_SERVER_PUBKEY` | WireGuard public key of the server | `sudo wg show wg0 public-key` on the server |
| `WG_ENDPOINT` | Server WireGuard endpoint, `host:port` | public IP or DDNS name + `ListenPort`, e.g. `deals.example.com:51820` |
| `WG_SERVER_IP` | Server's address inside the tunnel — the deploy target | `10.66.66.1` |

Optional repository **variable** `WG_CLIENT_ADDRESS` overrides the runner's
in-tunnel address (default `10.66.66.10/32`); it must match the `AllowedIPs`
of the runner peer on the server.

App secrets consumed by the generated `.env`: `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GROQ_API_KEY`,
`SERPAPI_API_KEY`, `NEXT_PUBLIC_APP_URL` (required) and `RESEND_API_KEY`
(optional). Write a literal `$` as `$$` — see the note in section 2.

### Server-side WireGuard peer (one-time)

```ini
# /etc/wireguard/wg0.conf  on the server — Address = 10.66.66.1/24 — add:
[Peer]
PublicKey = <wg pubkey of WG_PRIVATE_KEY>
AllowedIPs = 10.66.66.10/32
```

```bash
sudo wg-quick down wg0 && sudo wg-quick up wg0   # reload
```

Make sure CrowdSec / the firewall trusts the tunnel subnet (`10.66.66.0/24`)
and that `sshd` already listens on the WireGuard interface (port `4422`).

> **Out of scope here:** this workflow does **not** touch the server's
> `sshd_config` or `ufw`/nftables rules for port `4422`. Restricting public
> `4422` access (option 2A.4) is a separate manual decision for the operator,
> to be done only with the Oracle Serial Console available as a fallback.

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
