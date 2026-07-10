#!/bin/sh
# ARCH-01: Runtime backend URL injection.
# Vite bundle içindeki __VITE_RUNTIME_BACKEND_URL__ placeholder'ını
# BACKEND_URL env değişkeninin değeriyle değiştirir, ardından nginx'i başlatır.
set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:9000}"

find /usr/share/nginx/html/seller/assets -name "*.js" \
  -exec sed -i "s|__VITE_RUNTIME_BACKEND_URL__|${BACKEND_URL}|g" {} +

exec nginx -g "daemon off;"
