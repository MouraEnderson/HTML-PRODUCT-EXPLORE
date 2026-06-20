#!/usr/bin/env bash
# Uso (Git Bash no Windows):
#   cd /c/Users/Enderson/Projects/HTML-PRODUCT-EXPLORE/backend
#   export THREEDX_USERNAME="seu@email.com"
#   export THREEDX_PASSWORD="sua_senha"
#   bash scripts/run-cas-probe-gitbash.sh

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${THREEDX_USERNAME:-}" || -z "${THREEDX_PASSWORD:-}" ]]; then
  echo "FAIL: defina THREEDX_USERNAME e THREEDX_PASSWORD"
  echo "  export THREEDX_USERNAME=\"enderson.moura@ska.com.br\""
  echo "  export THREEDX_PASSWORD=\"...\""
  exit 1
fi

export THREEDX_SPACE_URL="${THREEDX_SPACE_URL:-https://r1132100929518-us1-space.3dexperience.3ds.com/enovia}"
export THREEDX_PASSPORT_URL="${THREEDX_PASSPORT_URL:-https://r1132100929518-eu1.iam.3dexperience.3ds.com}"
export THREEDX_SECURITY_CONTEXT="${THREEDX_SECURITY_CONTEXT:-ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO}"

echo "Pasta: $(pwd)"
echo "Node:  $(node -v 2>/dev/null || echo 'NAO INSTALADO')"
npm run probe:postman-cas
