#!/usr/bin/env bash
# Deploy de capacitacion.cruza.pet — página estática servida por nginx bare-metal.
# Idempotente: se puede correr cuantas veces quieras.
#
#   ./deploy.sh
#
# No usa Docker/Kamal: copia el HTML al VPS y mantiene el server block de nginx.
#
# IMPORTANTE (repo público): el host del VPS NO se versiona, porque revela el
# origen detrás de Cloudflare. Definilo en un deploy.env local (gitignored) o
# como variable de entorno. Copiá deploy.env.example -> deploy.env.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Config local NO versionada (host del VPS, etc.)
# shellcheck source=/dev/null
[ -f "${HERE}/deploy.env" ] && source "${HERE}/deploy.env"

: "${VPS_HOST:?Falta VPS_HOST. Copiá deploy.env.example a deploy.env y completá tu host (ej: root@tu-vps), o exportá VPS_HOST=...}"

DOMAIN="capacitacion.cruza.pet"
WEBROOT="/var/www/${DOMAIN}"
NGINX_CONF="/etc/nginx/sites-enabled/capacitacion-cruza-pet"

echo "==> Asegurando webroot ${WEBROOT} en el VPS"
ssh "$VPS_HOST" "mkdir -p '${WEBROOT}'"

echo "==> Copiando index.html"
scp "${HERE}/index.html" "${VPS_HOST}:${WEBROOT}/index.html"

echo "==> Instalando server block de nginx"
scp "${HERE}/nginx/capacitacion-cruza-pet.conf" "${VPS_HOST}:${NGINX_CONF}"

echo "==> Validando y recargando nginx"
ssh "$VPS_HOST" "nginx -t && systemctl reload nginx"

echo "==> Verificando en el origen (bypass DNS)"
VPS_IP="$(ssh "$VPS_HOST" "hostname -I | awk '{print \$1}'")"
curl -sk -o /dev/null -w "origin ${DOMAIN} HTTP %{http_code}\n" \
  --resolve "${DOMAIN}:443:${VPS_IP}" "https://${DOMAIN}/"

echo "==> Listo. Si el DNS ya está creado en Cloudflare: https://${DOMAIN}/"
