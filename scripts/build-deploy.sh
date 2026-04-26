#!/usr/bin/env bash
set -euo pipefail
#
# build-deploy.sh — Assemble frame-deploy/ from FRAME2.0 sources + deployed infra.
#
# Usage: bash scripts/build-deploy.sh [output-dir]
#   Default output: /Users/arpit/Desktop/frame-deploy
#
# Sources:
#   FRAME2.0 (this repo)  → src/, backend/docmining/app/, package*.json, configs
#   Deployed project       → .gitlab-ci.yml, Dockerfile (SPA), charts/, infra/
#

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOYED="/Users/arpit/Downloads/frame-project-files"
OUTPUT="${1:-/Users/arpit/Desktop/frame-deploy}"

if [ ! -d "${DEPLOYED}" ]; then
  echo "ERROR: Deployed project not found at ${DEPLOYED}"
  exit 1
fi

echo "=== Building frame-deploy at ${OUTPUT} ==="
rm -rf "${OUTPUT}"
mkdir -p "${OUTPUT}"

# ——————————————————————————————————————————————————————————————————————————————
# [1/8] SPA source — essential files for vite build
# ——————————————————————————————————————————————————————————————————————————————
echo "[1/8] SPA source files..."
cp "${REPO_ROOT}/package.json" "${OUTPUT}/"
cp "${REPO_ROOT}/package-lock.json" "${OUTPUT}/"
cp "${REPO_ROOT}/tsconfig.json" "${OUTPUT}/"
cp "${REPO_ROOT}/vite.config.ts" "${OUTPUT}/"
cp "${REPO_ROOT}/vitest.config.ts" "${OUTPUT}/"
cp "${REPO_ROOT}/index.html" "${OUTPUT}/"
cp "${REPO_ROOT}/CLAUDE.md" "${OUTPUT}/"

# src/ — full copy excluding test files, snapshots, and __pycache__
rsync -a --exclude='*.test.ts' --exclude='*.test.tsx' \
  --exclude='*.test.ts.snap' --exclude='__snapshots__/' \
  --exclude='__pycache__' --exclude='test/' \
  "${REPO_ROOT}/src/" "${OUTPUT}/src/"

# ——————————————————————————————————————————————————————————————————————————————
# [2/8] Backend DocMining — app code + pyproject.toml (NO models/, NO .venv/)
# ——————————————————————————————————————————————————————————————————————————————
echo "[2/8] Backend DocMining..."
mkdir -p "${OUTPUT}/backend/docmining"
cp "${REPO_ROOT}/backend/docmining/pyproject.toml" "${OUTPUT}/backend/docmining/"
cp "${REPO_ROOT}/backend/docmining/.dockerignore" "${OUTPUT}/backend/docmining/"
rsync -a --exclude='__pycache__' --exclude='*.pyc' \
  "${REPO_ROOT}/backend/docmining/app/" "${OUTPUT}/backend/docmining/app/"

# ——————————————————————————————————————————————————————————————————————————————
# [3/8] SPA Dockerfile — from deployed project (UBS Node24 + vite preview)
# ——————————————————————————————————————————————————————————————————————————————
echo "[3/8] SPA Dockerfile (from deployed)..."
cp "${DEPLOYED}/Dockerfile" "${OUTPUT}/Dockerfile"

# ——————————————————————————————————————————————————————————————————————————————
# [4/8] DocMining Dockerfile — 3-stage, Strategy A (models at build time)
# ——————————————————————————————————————————————————————————————————————————————
echo "[4/8] DocMining Dockerfile (UBS-adapted Strategy A)..."
cp "${REPO_ROOT}/scripts/templates/Dockerfile.docmining" \
   "${OUTPUT}/backend/docmining/Dockerfile"

# ——————————————————————————————————————————————————————————————————————————————
# [5/8] Helm charts — copy from deployed, append DocMining service
# ——————————————————————————————————————————————————————————————————————————————
echo "[5/8] Helm charts (unified, from deployed + DocMining)..."
rsync -a "${DEPLOYED}/charts/" "${OUTPUT}/charts/"

# Append DocMining service entry to values.yaml and each env values file
DOCMINING_SNIPPET="${REPO_ROOT}/scripts/templates/values-docmining-service.yaml"

for vf in "${OUTPUT}/charts/values.yaml" \
          "${OUTPUT}/charts/environments/values-dev.yaml" \
          "${OUTPUT}/charts/environments/values-engg.yaml" \
          "${OUTPUT}/charts/environments/values-main.yaml"; do
  if [ -f "${vf}" ]; then
    # Extract host and gateway from the existing SPA service entry
    HOST=$(grep -A2 'istio:' "${vf}" | grep 'Host:' | head -1 | sed 's/.*Host: *"\(.*\)"/\1/')
    GATEWAY=$(grep -A3 'istio:' "${vf}" | grep 'Gateway:' | head -1 | sed 's/.*Gateway: *"\(.*\)"/\1/')
    # Append DocMining service with correct host/gateway
    sed "s/HOST_PLACEHOLDER/${HOST}/; s|GATEWAY_PLACEHOLDER|${GATEWAY}|" \
      "${DOCMINING_SNIPPET}" >> "${vf}"
    echo "  Appended DocMining service to $(basename "${vf}")"
  fi
done

# ——————————————————————————————————————————————————————————————————————————————
# [6/8] CI/CD — copy from deployed, append DocMining build job
# ——————————————————————————————————————————————————————————————————————————————
echo "[6/8] CI/CD pipeline (from deployed + DocMining job)..."
cp "${DEPLOYED}/.gitlab-ci.yml" "${OUTPUT}/.gitlab-ci.yml"
cat "${REPO_ROOT}/scripts/templates/gitlab-ci-docmining-job.yml" >> "${OUTPUT}/.gitlab-ci.yml"
echo "  Appended DocMining build job to .gitlab-ci.yml"

# ——————————————————————————————————————————————————————————————————————————————
# [7/8] Infrastructure — namespaces + gateway (from deployed)
# ——————————————————————————————————————————————————————————————————————————————
echo "[7/8] Infrastructure (namespaces + gateway)..."
mkdir -p "${OUTPUT}/infra"
cp "${DEPLOYED}/infra/namespaces.yaml" "${OUTPUT}/infra/"
cp "${DEPLOYED}/infra/gateway-patch.yaml" "${OUTPUT}/infra/"

# ——————————————————————————————————————————————————————————————————————————————
# [8/8] Verify structure
# ——————————————————————————————————————————————————————————————————————————————
echo "[8/8] Verify structure..."
echo ""
echo "=== Verification ==="
EXPECTED_FILES=(
  "Dockerfile"
  "backend/docmining/Dockerfile"
  "backend/docmining/pyproject.toml"
  "backend/docmining/app/main.py"
  ".gitlab-ci.yml"
  "charts/Chart.yaml"
  "charts/values.yaml"
  "charts/environments/values-dev.yaml"
  "charts/environments/values-engg.yaml"
  "charts/environments/values-main.yaml"
  "charts/templates/deployment.yaml"
  "charts/templates/virtualservice.yaml"
  "infra/namespaces.yaml"
  "infra/gateway-patch.yaml"
  "package.json"
  "vite.config.ts"
  "src/main.tsx"
  "src/FederatedApp.tsx"
  "src/App.tsx"
  "CLAUDE.md"
)

missing=0
for f in "${EXPECTED_FILES[@]}"; do
  if [ ! -f "${OUTPUT}/${f}" ]; then
    echo "  MISSING: ${f}"
    missing=$((missing + 1))
  fi
done

if [ "${missing}" -eq 0 ]; then
  echo "  All ${#EXPECTED_FILES[@]} expected files present."
else
  echo "  WARNING: ${missing} file(s) missing!"
fi

# File count summary
total=$(find "${OUTPUT}" -type f | wc -l | tr -d ' ')
echo "  Total files: ${total}"
echo ""

# Verify no test files leaked
test_count=$(find "${OUTPUT}/src" -name '*.test.*' 2>/dev/null | wc -l | tr -d ' ')
if [ "${test_count}" -gt 0 ]; then
  echo "  WARNING: ${test_count} test file(s) found in src/"
else
  echo "  No test files in src/ (clean)"
fi

# Verify no models directory
if [ -d "${OUTPUT}/backend/docmining/models" ]; then
  echo "  WARNING: models/ directory found (should NOT be included)"
else
  echo "  No models/ directory (correct — downloaded at build time)"
fi

# Verify DocMining Dockerfile has Strategy A markers
if grep -q 'docling-tools models download' "${OUTPUT}/backend/docmining/Dockerfile"; then
  echo "  DocMining Dockerfile: Strategy A confirmed"
else
  echo "  WARNING: DocMining Dockerfile missing models download stage"
fi

echo ""
echo "=== frame-deploy ready at ${OUTPUT} ==="
echo "Next: push to DevCloud GitLab → CI pipeline deploys automatically"
