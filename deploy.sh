#!/usr/bin/env bash

set -euo pipefail

# Use docker compose v2 by default; allow override via COMPOSE_CMD
COMPOSE_CMD=${COMPOSE_CMD:-"docker compose"}

TARGET=${1:-app}

deploy_one() {
  local svc="$1"
  echo "[deploy] Stopping service: ${svc} (if running) ..."
  ${COMPOSE_CMD} stop ${svc} || true

  echo "[deploy] Removing service container: ${svc} ..."
  ${COMPOSE_CMD} rm -f ${svc} || true

  echo "[deploy] Building image for service: ${svc} ..."
  ${COMPOSE_CMD} build --pull ${svc}

  echo "[deploy] Starting service in detached mode: ${svc} ..."
  ${COMPOSE_CMD} up -d ${svc}
}

case "${TARGET}" in
  app|elasticsearch|kibana)
    deploy_one "${TARGET}"
    ;;
  all)
    for svc in app elasticsearch kibana; do
      deploy_one "$svc"
    done
    ;;
  *)
    echo "Usage: $0 [app|elasticsearch|kibana|all]"
    exit 1
    ;;
esac

echo "[deploy] Done. Current services:"
${COMPOSE_CMD} ps


