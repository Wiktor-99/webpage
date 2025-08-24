#!/bin/sh

DOMAIN=${DOMAIN:-wiktorbajor.com}
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

echo "Checking for existing certificates for domain: $DOMAIN"

if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
    echo "Generating temporary self-signed certificate..."
    mkdir -p "$CERT_DIR"

    apk add --no-cache openssl >/dev/null 2>&1
    openssl req -x509 -nodes -days 3 -newkey rsa:2048 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=$DOMAIN"

    echo "Temporary certificate created for $DOMAIN"
else
    echo "Certificate files already exist for $DOMAIN, skipping initialization"
fi

echo "Certificate initialization complete"
