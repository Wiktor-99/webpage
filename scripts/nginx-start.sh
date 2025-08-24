#!/bin/sh
set -eu

DOMAIN="wiktorbajor.com"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
PID_FILE="/run/nginx/nginx.pid"

mkdir -p /run/nginx

echo "Starting nginx with SSL certificate monitoring..."

nginx -g "daemon off; pid $PID_FILE;" &
NGINX_PID=$!

sleep 2

echo "nginx started with PID $NGINX_PID"

trap 'echo "Shutting down nginx..."; kill -QUIT $NGINX_PID; wait $NGINX_PID; exit 0' TERM INT

prev=""
while :; do
  if ! kill -0 $NGINX_PID 2>/dev/null; then
    echo "nginx process died unexpectedly"
    exit 1
  fi

  cur=$(sha256sum "$CERT_PATH/fullchain.pem" "$CERT_PATH/privkey.pem" 2>/dev/null || true)
  if [ "$cur" != "$prev" ] && [ -n "$cur" ]; then
    echo "Certificate files changed, reloading nginx configuration..."
    # Use HUP signal directly to the process
    if kill -HUP $NGINX_PID; then
      echo "nginx reloaded successfully"
      prev="$cur"
    else
      echo "nginx reload failed, will retry next cycle"
    fi
  fi

  sleep 30
done
