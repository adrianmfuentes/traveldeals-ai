#!/usr/bin/env bash
#
# remote-deploy.sh — se ejecuta EN EL SERVIDOR a través de la única
# conexión SSH multiplexada abierta por .github/workflows/deploy.yml.
#
# Contiene TODA la lógica remota del despliegue:
#   - login en el registry de contenedores
#   - docker compose pull / down / up
#   - bucle de health-check de la app
#
# El workflow transfiere junto a este script:
#   docker-compose.yml   (renombrado desde docker-compose.prod.yml)
#   .env                 (variables de entorno de producción)
#   .deploy.env          (credenciales del registry + flags; se borra al salir)
#
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$HOME/traveldeals-ai}"
cd "$DEPLOY_DIR"

# Credenciales y flags transferidos junto al bundle.
if [ -f .deploy.env ]; then
  # shellcheck disable=SC1091
  . ./.deploy.env
fi

REGISTRY="${REGISTRY:-ghcr.io}"
CLEAN_VOLUMES="${CLEAN_VOLUMES:-false}"

cleanup() {
  docker logout "$REGISTRY" >/dev/null 2>&1 || true
  rm -f "$DEPLOY_DIR/.deploy.env"
}
trap cleanup EXIT

if [ -n "${GHCR_TOKEN:-}" ]; then
  printf '%s' "$GHCR_TOKEN" \
    | docker login "$REGISTRY" -u "${GHCR_USER:?GHCR_USER requerido}" --password-stdin
fi

echo "==> docker compose pull"
docker compose pull

if [ "$CLEAN_VOLUMES" = "true" ]; then
  echo "==> ADVERTENCIA: eliminando volúmenes de datos (postgres + redis)"
  docker compose down --volumes --remove-orphans 2>/dev/null || true
else
  docker compose down --remove-orphans 2>/dev/null || true
fi

sleep 3
echo "==> docker compose up -d"
docker compose up -d

echo "==> Esperando health-check de 'app'"
healthy=false
for ((i = 1; i <= 30; i++)); do
  cid="$(docker compose ps -q app 2>/dev/null || true)"
  status="$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    echo "==> App healthy (intento $i)"
    healthy=true
    break
  fi
  echo "    ... status=${status:-desconocido} (intento $i/30)"
  sleep 2
done

if [ "$healthy" != "true" ]; then
  echo "ERROR: la app no alcanzó estado 'healthy'. Últimas 50 líneas de log:"
  docker compose logs --tail=50 app 2>&1 || true
  exit 1
fi

docker compose ps
