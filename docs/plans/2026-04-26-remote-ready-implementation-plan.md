# Remote-Ready Deployment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a clean `frame-deploy/` folder from FRAME2.0 sources + deployed project infra, ready to push to DevCloud GitLab for AKS deployment.

**Architecture:** A build script (`scripts/build-deploy.sh`) assembles `frame-deploy/` by copying essential source from FRAME2.0 and merging CI/CD + Helm from the deployed project. DocMining Dockerfile uses 3-stage Strategy A (models downloaded at build time). Single unified Helm chart with two services.

**Tech Stack:** Bash (build script), GitLab CI (Kaniko), Helm v1, Istio VirtualService, Docker multi-stage, UBS infra (container-registry.ubs.net, Nexus, Vault).

---

## Task 1: Create the build script skeleton

**Files:**
- Create: `scripts/build-deploy.sh`

**Step 1: Write the script**

```bash
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

echo "[1/8] SPA source files..."
echo "[2/8] Backend DocMining..."
echo "[3/8] SPA Dockerfile (from deployed)..."
echo "[4/8] DocMining Dockerfile (UBS-adapted Strategy A)..."
echo "[5/8] Helm charts (unified, from deployed + DocMining)..."
echo "[6/8] CI/CD pipeline (from deployed + DocMining job)..."
echo "[7/8] Infrastructure (namespaces + gateway)..."
echo "[8/8] Verify structure..."

echo "=== Done ==="
```

**Step 2: Verify**

```bash
chmod +x scripts/build-deploy.sh
bash scripts/build-deploy.sh /tmp/test-deploy
ls /tmp/test-deploy  # should be empty dir for now
```

**Step 3: Commit**

```bash
git add scripts/build-deploy.sh
git commit -m "chore(deploy): build-deploy.sh skeleton"
```

---

## Task 2: Copy SPA source files

**Files:**
- Modify: `scripts/build-deploy.sh` — implement step [1/8]

**Step 1: Add to the script after the `echo "[1/8]..."` line:**

```bash
# [1/8] SPA source — essential files for vite build
cp "${REPO_ROOT}/package.json" "${OUTPUT}/"
cp "${REPO_ROOT}/package-lock.json" "${OUTPUT}/"
cp "${REPO_ROOT}/tsconfig.json" "${OUTPUT}/"
cp "${REPO_ROOT}/vite.config.ts" "${OUTPUT}/"
cp "${REPO_ROOT}/vitest.config.ts" "${OUTPUT}/"
cp "${REPO_ROOT}/index.html" "${OUTPUT}/"
cp "${REPO_ROOT}/CLAUDE.md" "${OUTPUT}/"

# src/ — full copy excluding test files and __pycache__
rsync -a --exclude='*.test.ts' --exclude='*.test.tsx' \
  --exclude='__pycache__' --exclude='test/' \
  "${REPO_ROOT}/src/" "${OUTPUT}/src/"
```

**Step 2: Verify**

```bash
bash scripts/build-deploy.sh /tmp/test-deploy
ls /tmp/test-deploy/src/main.tsx          # exists
ls /tmp/test-deploy/src/FederatedApp.tsx   # exists
ls /tmp/test-deploy/package.json           # exists
ls /tmp/test-deploy/vite.config.ts         # exists
# No test files:
find /tmp/test-deploy/src -name '*.test.*' | wc -l  # 0
```

**Step 3: Commit**

```bash
git add scripts/build-deploy.sh
git commit -m "chore(deploy): step 1 — copy SPA source files"
```

---

## Task 3: Copy backend DocMining

**Files:**
- Modify: `scripts/build-deploy.sh` — implement step [2/8]

**Step 1: Add after step 1:**

```bash
# [2/8] Backend DocMining — app code + pyproject.toml (NO models/, NO .venv/)
mkdir -p "${OUTPUT}/backend/docmining"
cp "${REPO_ROOT}/backend/docmining/pyproject.toml" "${OUTPUT}/backend/docmining/"
cp "${REPO_ROOT}/backend/docmining/.dockerignore" "${OUTPUT}/backend/docmining/"
rsync -a --exclude='__pycache__' --exclude='*.pyc' \
  "${REPO_ROOT}/backend/docmining/app/" "${OUTPUT}/backend/docmining/app/"
```

**Step 2: Verify**

```bash
bash scripts/build-deploy.sh /tmp/test-deploy
ls /tmp/test-deploy/backend/docmining/pyproject.toml    # exists
ls /tmp/test-deploy/backend/docmining/app/main.py       # exists
ls /tmp/test-deploy/backend/docmining/models/ 2>&1      # NOT FOUND (correct!)
```

**Step 3: Commit**

```bash
git add scripts/build-deploy.sh
git commit -m "chore(deploy): step 2 — copy backend DocMining (no models)"
```

---

## Task 4: Copy SPA Dockerfile from deployed project

**Files:**
- Modify: `scripts/build-deploy.sh` — implement step [3/8]

**Step 1: Add:**

```bash
# [3/8] SPA Dockerfile — from deployed project (UBS Node24 + vite preview)
cp "${DEPLOYED}/Dockerfile" "${OUTPUT}/Dockerfile"
```

**Step 2: Verify**

```bash
bash scripts/build-deploy.sh /tmp/test-deploy
grep 'container-registry.ubs.net' /tmp/test-deploy/Dockerfile  # UBS base image
grep 'EXPOSE 3002' /tmp/test-deploy/Dockerfile                 # port 3002
```

**Step 3: Commit**

```bash
git add scripts/build-deploy.sh
git commit -m "chore(deploy): step 3 — SPA Dockerfile from deployed"
```

---

## Task 5: Create DocMining Dockerfile (Strategy A)

**Files:**
- Create: `scripts/templates/Dockerfile.docmining`
- Modify: `scripts/build-deploy.sh` — implement step [4/8]

**Step 1: Create the template file at `scripts/templates/Dockerfile.docmining`**

Use the exact Dockerfile from design doc §6 (3-stage: builder → models → runtime, UBS CA certs, Nexus pip, `docling-tools models download`, `HF_HUB_OFFLINE=1` runtime).

Full content as specified in the design doc Section 6.

**Step 2: Add to build script:**

```bash
# [4/8] DocMining Dockerfile — 3-stage, Strategy A (models at build time)
cp "${REPO_ROOT}/scripts/templates/Dockerfile.docmining" \
   "${OUTPUT}/backend/docmining/Dockerfile"
```

**Step 3: Verify**

```bash
bash scripts/build-deploy.sh /tmp/test-deploy
grep 'docling-tools models download' /tmp/test-deploy/backend/docmining/Dockerfile  # models stage
grep 'HF_HUB_OFFLINE=1' /tmp/test-deploy/backend/docmining/Dockerfile              # offline runtime
grep 'container-registry.ubs.net' /tmp/test-deploy/backend/docmining/Dockerfile     # UBS base
grep 'certinfo.ubs.com' /tmp/test-deploy/backend/docmining/Dockerfile               # UBS CA certs
grep 'it4it-nexus' /tmp/test-deploy/backend/docmining/Dockerfile                    # Nexus pip
```

**Step 4: Commit**

```bash
git add scripts/templates/Dockerfile.docmining scripts/build-deploy.sh
git commit -m "chore(deploy): step 4 — DocMining Dockerfile Strategy A (UBS-adapted)"
```

---

## Task 6: Copy + extend Helm charts

**Files:**
- Create: `scripts/templates/values-docmining-service.yaml` (the DocMining service entry snippet)
- Modify: `scripts/build-deploy.sh` — implement step [5/8]

**Step 1: Create the DocMining service snippet at `scripts/templates/values-docmining-service.yaml`:**

```yaml
  # Service 2: DocMining (appended by build-deploy.sh)
  - istio:
      Enabled: true
      Host: "HOST_PLACEHOLDER"
      Gateway: "GATEWAY_PLACEHOLDER"
      Path: "/api/docmining"
    app:
      name: frame-docmining
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      pod:
        image:
          repository: snapshot-container-registry.ubs.net/ubs/wma/frame-docmining
          tag: "latest"
          pullPolicy: IfNotPresent
        port: 8000
        replicaCount: 1
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 1000m
            memory: 4Gi
        terminationGracePeriodSeconds: 200
        env:
          - name: HF_HUB_OFFLINE
            value: "1"
          - name: TRANSFORMERS_OFFLINE
            value: "1"
          - name: DOCMINING_ARTIFACTS_PATH
            value: /app/.cache/docling/models
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        volumeMounts:
          - name: tmp
            mountPath: /tmp
        volumes:
          - name: tmp
            emptyDir: {}
        nodeSelector: {}
        tolerations:
          - key: "kubernetes.azure.com/scalesetpriority"
            operator: "Equal"
            value: "spot"
            effect: "NoSchedule"
      service:
        type: ClusterIP
        port: 8000
        targetPort: 8000
      tolerations: []
      affinity: {}
```

**Step 2: Add to build script:**

```bash
# [5/8] Helm charts — copy from deployed, append DocMining service
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
    echo "  Appended DocMining service to $(basename ${vf})"
  fi
done
```

**Step 3: Verify**

```bash
bash scripts/build-deploy.sh /tmp/test-deploy
grep 'frame-docmining' /tmp/test-deploy/charts/values.yaml                    # DocMining present
grep 'frame-docmining' /tmp/test-deploy/charts/environments/values-dev.yaml   # present in dev
grep '/api/docmining' /tmp/test-deploy/charts/environments/values-dev.yaml    # Istio path
helm lint /tmp/test-deploy/charts/                                             # lint passes
```

**Step 4: Commit**

```bash
git add scripts/templates/values-docmining-service.yaml scripts/build-deploy.sh
git commit -m "chore(deploy): step 5 — Helm charts with DocMining service entry"
```

---

## Task 7: Create extended `.gitlab-ci.yml`

**Files:**
- Create: `scripts/templates/gitlab-ci-docmining-job.yml` (the DocMining build job snippet)
- Modify: `scripts/build-deploy.sh` — implement step [6/8]

**Step 1: Create the CI job snippet at `scripts/templates/gitlab-ci-docmining-job.yml`:**

```yaml

# ————————————————————————————————————————
# Build DocMining image via Kaniko
# ————————————————————————————————————————
build_docmining_image:
  stage: build_publish_snapshot_image
  variables:
    SUFFIX: "-unstable"
  image:
    name: container-registry.ubs.net/ubs/ci/gitlab/kaniko:v1.6.0-debug
    entrypoint: [""]
  before_script:
    - export UBSCTL_FINGERPRINT_ARTIFACTS="${DOCKER_REPOSITORY}${WMA_DOCKER_NAMESPACE}/frame-docmining:${DOCKER_IMAGE_TAG}${SUFFIX}"
  script:
    - mkdir -p /kaniko/.docker
    - cat /usr/local/share/ca-certificates/*.crt >> /kaniko/ssl/certs/ubs-ca-certificates.crt || true
    - umount /usr/local/share/ca-certificates/ || true
    - cp /kaniko/ssl/certs/ubs-ca-certificates.crt $CI_PROJECT_DIR/ubs-ca-certificates.crt || true
    - echo "{\"auths\":{\"$DOCKER_REPOSITORY\":{\"auth\":\"$(echo -n $WMA_DOCKER_USER:$WMA_DOCKER_PASS | base64)\"}}}" > /kaniko/.docker/config.json
    - /kaniko/executor
      --context $CI_PROJECT_DIR/backend/docmining
      --dockerfile $CI_PROJECT_DIR/backend/docmining/Dockerfile
      --destination "${DOCKER_REPOSITORY}${WMA_DOCKER_NAMESPACE}/frame-docmining:${CI_JOB_ID}${SUFFIX}"
    - echo "DOCMINING_IMAGE=${DOCKER_REPOSITORY}${WMA_DOCKER_NAMESPACE}/frame-docmining:${CI_JOB_ID}${SUFFIX}"
    - echo "DOCMINING_IMAGE=${DOCKER_REPOSITORY}${WMA_DOCKER_NAMESPACE}/frame-docmining:${CI_JOB_ID}${SUFFIX}" >> variables-docmining.env
  artifacts:
    reports:
      dotenv: variables-docmining.env
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH'
```

**Step 2: Add to build script:**

```bash
# [6/8] CI/CD — copy from deployed, append DocMining build job
cp "${DEPLOYED}/.gitlab-ci.yml" "${OUTPUT}/.gitlab-ci.yml"
cat "${REPO_ROOT}/scripts/templates/gitlab-ci-docmining-job.yml" >> "${OUTPUT}/.gitlab-ci.yml"
echo "  Appended DocMining build job to .gitlab-ci.yml"
```

**Step 3: Verify**

```bash
bash scripts/build-deploy.sh /tmp/test-deploy
grep 'build_docmining_image' /tmp/test-deploy/.gitlab-ci.yml   # job exists
grep 'frame-docmining' /tmp/test-deploy/.gitlab-ci.yml          # image name
grep 'backend/docmining/Dockerfile' /tmp/test-deploy/.gitlab-ci.yml  # context
```

**Step 4: Commit**

```bash
git add scripts/templates/gitlab-ci-docmining-job.yml scripts/build-deploy.sh
git commit -m "chore(deploy): step 6 — .gitlab-ci.yml with DocMining build job"
```

---

## Task 8: Copy infrastructure + final verification

**Files:**
- Modify: `scripts/build-deploy.sh` — implement steps [7/8] and [8/8]

**Step 1: Add:**

```bash
# [7/8] Infrastructure — namespaces + gateway (from deployed)
mkdir -p "${OUTPUT}/infra"
cp "${DEPLOYED}/infra/namespaces.yaml" "${OUTPUT}/infra/"
cp "${DEPLOYED}/infra/gateway-patch.yaml" "${OUTPUT}/infra/"

# [8/8] Verify structure
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
```

**Step 2: Run the full build and verify**

```bash
bash scripts/build-deploy.sh /tmp/test-deploy
# Should show: All 20 expected files present, no test files, no models/, Strategy A confirmed
```

**Step 3: Helm lint**

```bash
helm lint /tmp/test-deploy/charts/
# Should pass (may warn about missing icon — non-blocking)
```

**Step 4: Commit**

```bash
git add scripts/build-deploy.sh
git commit -m "chore(deploy): steps 7-8 — infra copy + full verification

build-deploy.sh complete: 8 steps, 20+ file checks, no test files,
no models dir, Strategy A verified. Ready for execution."
```

---

## Task 9: Run the build and create frame-deploy/

**Files:**
- No new files — execution of the build script

**Step 1: Run the build**

```bash
bash scripts/build-deploy.sh /Users/arpit/Desktop/frame-deploy
```

Expected output: All 20 files present, no warnings.

**Step 2: Inspect the output**

```bash
find /Users/arpit/Desktop/frame-deploy -type f | sort | head -40
```

**Step 3: Verify helm lint**

```bash
helm lint /Users/arpit/Desktop/frame-deploy/charts/
```

**Step 4: Verify DocMining Dockerfile**

```bash
grep -c 'stage' /Users/arpit/Desktop/frame-deploy/backend/docmining/Dockerfile  # 3 stages
grep 'HF_HUB_OFFLINE' /Users/arpit/Desktop/frame-deploy/backend/docmining/Dockerfile  # offline runtime
```

**Step 5: Verify .gitlab-ci.yml has both build jobs**

```bash
grep 'build_publish_snapshot_image\|build_docmining_image' /Users/arpit/Desktop/frame-deploy/.gitlab-ci.yml
```

**No commit for this task** — the output is at `/Users/arpit/Desktop/frame-deploy/`, not in the FRAME2.0 repo.

---

## Verification

After all 9 tasks, the `frame-deploy/` folder at `/Users/arpit/Desktop/frame-deploy` should:

1. Contain all essential SPA source (no test files)
2. Contain backend/docmining/app/ + pyproject.toml (no models/)
3. Have SPA Dockerfile (UBS Node24, port 3002)
4. Have DocMining Dockerfile (3-stage Strategy A, UBS certs, Nexus pip, offline runtime)
5. Have unified Helm chart with 2 services (SPA + DocMining)
6. Have .gitlab-ci.yml with both Kaniko build jobs
7. Have infra/ (namespaces + gateway)
8. Pass `helm lint`

Use `superpowers:verification-before-completion` before claiming done.

---

Plan complete and saved to `docs/plans/2026-04-26-remote-ready-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?
