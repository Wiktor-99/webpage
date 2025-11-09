#!/bin/sh
set -eu

DOMAIN="${DOMAIN:-wiktorbajor.com}"
EMAIL="${EMAIL:-wiktorbajor1@gmail.com}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Starting certificate management for domain: $DOMAIN"

log "Waiting for nginx to be ready..."
MAX_WAIT=60
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if wget --spider --timeout=2 "http://nginx/health" 2>/dev/null; then
    log "Nginx is ready"
    break
  fi
  WAIT_COUNT=$((WAIT_COUNT + 1))
  sleep 2
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
  log "WARNING: Nginx not responding after ${MAX_WAIT} attempts"
fi

log "Checking for broken certificate configurations..."

CONFIG_BROKEN=false
if [ -f "/etc/letsencrypt/renewal/$DOMAIN.conf" ]; then
  if ! certbot certificates --cert-name "$DOMAIN" >/dev/null 2>&1; then
    log "Certificate configuration is broken (invalid cert-name)"
    CONFIG_BROKEN=true
  fi
fi

if [ "$CONFIG_BROKEN" = "false" ] && [ -f "/etc/letsencrypt/renewal/$DOMAIN.conf" ]; then
  if ! certbot renew --dry-run --cert-name "$DOMAIN" >/dev/null 2>&1; then
    log "Renewal configuration test failed, marking as broken"
    CONFIG_BROKEN=true
  fi
fi

if [ "$CONFIG_BROKEN" = "true" ]; then
  log "Certificate configuration is broken, cleaning up completely..."
  rm -rf "/etc/letsencrypt/renewal/$DOMAIN.conf" || true
  rm -rf "/etc/letsencrypt/live/$DOMAIN" || true
  rm -rf "/etc/letsencrypt/archive/$DOMAIN" || true
  rm -rf "/etc/letsencrypt/keys" || true
  log "Cleanup completed"
fi

if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] || [ "$CONFIG_BROKEN" = "true" ]; then
  log "Obtaining new certificate for $DOMAIN..."

  sleep 10

  MAX_RETRIES=3
  RETRY_COUNT=0
  CERT_SUCCESS=false

  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "Certificate acquisition attempt $RETRY_COUNT/$MAX_RETRIES"

    if certbot certonly \
      --webroot \
      --webroot-path=/var/www/certbot \
      --email "$EMAIL" \
      --agree-tos \
      --no-eff-email \
      --non-interactive \
      --keep-until-expiring \
      --preferred-challenges http \
      -d "$DOMAIN" \
      -d "www.$DOMAIN"; then
      log "✓ Certificate obtained successfully!"
      CERT_SUCCESS=true
      break
    else
      log "✗ Failed to obtain certificate (attempt $RETRY_COUNT/$MAX_RETRIES)"
      if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        log "Waiting 30 seconds before retry..."
        sleep 30
      fi
    fi
  done

  if [ "$CERT_SUCCESS" = "false" ]; then
    log "ERROR: Failed to obtain certificate after $MAX_RETRIES attempts"
    log "Will continue and retry in the next renewal cycle"
  fi
else
  log "Valid certificate already exists"
  certbot certificates --cert-name "$DOMAIN" 2>&1 | head -n 10
fi

log "Entering renewal monitoring loop (checks every 12 hours)"

while :; do
  log "=== Certificate Renewal Check ==="

  if [ -f "/etc/letsencrypt/renewal/$DOMAIN.conf" ] && certbot certificates --cert-name "$DOMAIN" >/dev/null 2>&1; then
    log "Running certificate renewal check..."

    if certbot renew --webroot -w /var/www/certbot --deploy-hook "echo 'Certificate renewed successfully'" 2>&1 | tee /tmp/certbot-renew.log; then
      log "✓ Renewal check completed successfully"

      if grep -q "renewed successfully" /tmp/certbot-renew.log; then
        log "✓ Certificate was RENEWED - nginx will auto-reload"
      elif grep -q "not yet due for renewal" /tmp/certbot-renew.log; then
        log "Certificate is still valid, no renewal needed"
      fi
    else
      log "✗ WARNING: Renewal check failed, will retry in next cycle"
    fi

    rm -f /tmp/certbot-renew.log
  else
    log "WARNING: No valid renewal configuration found"
    log "Attempting to re-acquire certificate..."

    if certbot certonly \
      --webroot \
      --webroot-path=/var/www/certbot \
      --email "$EMAIL" \
      --agree-tos \
      --no-eff-email \
      --non-interactive \
      --keep-until-expiring \
      -d "$DOMAIN" \
      -d "www.$DOMAIN" 2>&1; then
      log "✓ Certificate re-acquired successfully"
    else
      log "✗ Failed to re-acquire certificate"
    fi
  fi

  log "Next renewal check in 12 hours"
  sleep 43200
done


