#!/bin/sh
set -eu

DOMAIN="wiktorbajor.com"
EMAIL="wiktorbajor1@gmail.com"

echo "Checking for broken certificate configurations..."

CONFIG_BROKEN=false
if [ -f "/etc/letsencrypt/renewal/$DOMAIN.conf" ]; then
  if ! certbot certificates --cert-name "$DOMAIN" >/dev/null 2>&1; then
    CONFIG_BROKEN=true
  fi
fi

if [ "$CONFIG_BROKEN" = "false" ] && [ -f "/etc/letsencrypt/renewal/$DOMAIN.conf" ]; then
  if ! certbot renew --dry-run --cert-name "$DOMAIN" >/dev/null 2>&1; then
    echo "Renewal configuration test failed, marking as broken"
    CONFIG_BROKEN=true
  fi
fi

if [ "$CONFIG_BROKEN" = "true" ]; then
  echo "Certificate configuration is broken, cleaning up completely..."
  rm -rf "/etc/letsencrypt/renewal/$DOMAIN.conf" || true
  rm -rf "/etc/letsencrypt/live/$DOMAIN" || true
  rm -rf "/etc/letsencrypt/archive/$DOMAIN" || true
  rm -rf "/etc/letsencrypt/keys" || true
  echo "Cleanup completed"
fi

if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] || [ "$CONFIG_BROKEN" = "true" ]; then
  echo "Obtaining new certificate for $DOMAIN..."

  sleep 10

  if certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"; then
    echo "Certificate obtained successfully!"
  else
    echo "Failed to obtain certificate. Will retry later."
  fi
else
  echo "Valid certificate already exists"
fi

while :; do
  echo "Checking for certificate renewal..."

  if [ -f "/etc/letsencrypt/renewal/$DOMAIN.conf" ] && certbot certificates --cert-name "$DOMAIN" >/dev/null 2>&1; then
    certbot renew --webroot -w /var/www/certbot --quiet || true
  else
    echo "No valid renewal configuration found, skipping renewal check"
  fi

  now=$(date +%s)
  midnight=$(date -d "tomorrow 00:00" +%s 2>/dev/null || true)
  if [ -z "${midnight:-}" ]; then
    sleep 86400
    continue
  fi
  sleep_seconds=$((midnight - now))
  if [ "$sleep_seconds" -lt 0 ]; then sleep_seconds=86400; fi
  sleep "$sleep_seconds"
done


