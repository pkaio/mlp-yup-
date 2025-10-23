#!/bin/bash
set -euo pipefail

APP_ROOT="/var/app/staging"
BACKEND_DIR="${APP_ROOT}/backend"

if [ ! -d "${BACKEND_DIR}" ]; then
  echo "Backend directory not found at ${BACKEND_DIR}" >&2
  exit 1
fi

cd "${BACKEND_DIR}"

if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi
