# Remote-Ready Deployment Setup — Design

**Date:** 2026-04-26
**Status:** Approved (brainstorm)
**Reference:** `/Users/arpit/Downloads/frame-project-files` (currently deployed), `/Users/arpit/Documents/FRAME3_reference` (FRAME3 blueprint)
**Next step:** `superpowers:writing-plans` for implementation tasks

---

## 1. Goal

Create a clean `frame-deploy/` folder containing only essential files for remote (RDP/AKS) deployment. Extends the existing deployed CI/CD pattern to include DocMining as a second service. Models baked into image at build time (Strategy A) — no HuggingFace access at runtime.

## 2. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Folder approach | New clean `frame-deploy/` | No dev tooling baggage (docs, devlog, kit-runner, powerstack4) |
| Helm chart | Single unified chart (services array) | Matches deployed pattern; templates loop over services |
| DocMining models | Strategy A — download in Docker build stage | UBS CI has outbound via proxy; runtime is fully offline (HF_HUB_OFFLINE=1) |
| Base images | `container-registry.ubs.net/` prefix | AKS Gatekeeper blocks Docker Hub |
| pip registry | UBS Nexus (`it4it-nexus-tp-repo.swissbank.com`) | Corporate proxy requirement |
| SPA Dockerfile | UBS Node24 base + vite preview on :3002 | Matches existing deployed pattern |
| CI/CD | Extend deployed `.gitlab-ci.yml` | Add `build_docmining_image` Kaniko job |

## 3. Clean Folder Structure

```
frame-deploy/
├── .gitlab-ci.yml                        # CI/CD pipeline (5 stages)
├── Dockerfile                            # SPA — UBS Node24, vite preview :3002
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts                        # With loadEnv fix for proxy targets
├── vitest.config.ts
├── CLAUDE.md
├── src/                                  # Full application source
│   ├── main.tsx
│   ├── FederatedApp.tsx
│   ├── App.tsx
│   ├── stores/
│   ├── components/
│   ├── services/
│   ├── domain/
│   ├── pipeline/
│   ├── theme/
│   └── chat/
├── backend/
│   └── docmining/
│       ├── Dockerfile                    # 3-stage: builder → models → runtime
│       ├── pyproject.toml
│       ├── .dockerignore
│       └── app/                          # FastAPI service code
├── charts/
│   ├── Chart.yaml                        # Single unified chart (apiVersion v1)
│   ├── .helmignore
│   ├── values.yaml                       # Default values (2 services)
│   ├── environments/
│   │   ├── values-dev.yaml               # dev → frame-dev
│   │   ├── values-engg.yaml              # feature/* → frame-engg
│   │   └── values-main.yaml              # main → frame
│   └── templates/
│       ├── _helpers.tpl
│       ├── deployment.yaml               # {{ range .Values.services }}
│       ├── service.yaml
│       ├── virtualservice.yaml           # Istio routing
│       └── horizontalpodautoscaler.yaml
└── infra/
    ├── namespaces.yaml                   # frame, frame-dev, frame-engg
    └── gateway-patch.yaml                # Istio gateway host entries
```

### Excluded from FRAME2.0

- `docs/` (plans, devlog, adr, knowledge, research, runbooks, reviews)
- `.powerstack4/`, `.taskmaster/`, `scripts/ralph/`
- `.claude/` (hooks, commands, rules, settings)
- `AGENTS.md`, `.devlog-template.md`
- `charts/frame-docmining/`, `charts/frame-spa/`, `charts/frame-ingress/` (local-only, replaced by unified chart)
- `docker-compose.yml`, `infra/local/`, `infra/kind/` (local dev only)
- `backend/docmining/models/` (downloaded in Docker build, never in git)
- `node_modules/`, `dist/`, `.venv/`

## 4. CI/CD Pipeline

### Stages

```
test → build_publish_snapshot_image → container-test → setup-infra → deploy
```

### Jobs (from deployed, unchanged)

- `fetch_akv_secrets` — Azure Key Vault → AI secrets
- `build_publish_snapshot_image` — SPA via Kaniko
- `sysdig-scan` — container security
- `setup-infra` — `kubectl apply` namespaces + gateway
- `deploy-dev` / `deploy-main` / `deploy-engg` — Helm upgrade per branch

### New job — DocMining

```yaml
build_docmining_image:
  stage: build_publish_snapshot_image
  image:
    name: container-registry.ubs.net/ubs/ci/gitlab/kaniko:v1.6.0-debug
    entrypoint: [""]
  script:
    - /kaniko/executor
      --context $CI_PROJECT_DIR/backend/docmining
      --dockerfile $CI_PROJECT_DIR/backend/docmining/Dockerfile
      --destination "${DOCKER_REPOSITORY}${WMA_DOCKER_NAMESPACE}/frame-docmining:${CI_JOB_ID}${SUFFIX}"
  artifacts:
    reports:
      dotenv: variables-docmining.env
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH'
    - changes:
        - backend/docmining/**/*
```

### Branch → Environment mapping

| Branch | Namespace | URL |
|--------|-----------|-----|
| `dev` | `frame-dev` | `https://frame-dev.dmeshdev.azpriv-cloud.ubs.net/frame` |
| `feature/*` | `frame-engg` | `https://frame-engg.dmeshdev.azpriv-cloud.ubs.net/frame` |
| `main` | `frame` | `https://frame.dmeshdev.azpriv-cloud.ubs.net/frame` |

## 5. Unified Helm Chart — Two Services

### `values.yaml` (default)

```yaml
imageTag: "latest"

services:
  # Service 1: SPA
  - istio:
      Enabled: true
      Host: "*.dmeshdev.azpriv-cloud.ubs.net"
      Gateway: "dmesh-dev-istio-gateway"
      Path: "/frame"
    app:
      name: frame
      securityContext: {}
      pod:
        image:
          repository: snapshot-container-registry.ubs.net/ubs/wma/frame
          tag: "latest"
          pullPolicy: IfNotPresent
        port: 3002
        replicaCount: 1
        resources:
          requests: { cpu: 800m, memory: 2Gi }
          limits: { cpu: 800m, memory: 4Gi }
        terminationGracePeriodSeconds: 10
      service:
        type: ClusterIP
        port: 3002
        targetPort: 3002

  # Service 2: DocMining
  - istio:
      Enabled: true
      Host: "*.dmeshdev.azpriv-cloud.ubs.net"
      Gateway: "dmesh-dev-istio-gateway"
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
          requests: { cpu: 1000m, memory: 2Gi }
          limits: { cpu: 1000m, memory: 4Gi }
        terminationGracePeriodSeconds: 200
        env:
          - name: HF_HUB_OFFLINE
            value: "1"
          - name: TRANSFORMERS_OFFLINE
            value: "1"
          - name: DOCMINING_ARTIFACTS_PATH
            value: /app/.cache/docling/models
        livenessProbe:
          httpGet: { path: /healthz, port: 8000 }
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet: { path: /readyz, port: 8000 }
          initialDelaySeconds: 30
          periodSeconds: 10
        volumeMounts:
          - name: tmp
            mountPath: /tmp
        volumes:
          - name: tmp
            emptyDir: {}
      service:
        type: ClusterIP
        port: 8000
        targetPort: 8000
```

Per-environment values (`values-dev.yaml`, `values-engg.yaml`, `values-main.yaml`) override `istio.Host` and `istio.Gateway` per namespace.

## 6. DocMining Dockerfile (Strategy A — UBS adapted)

3-stage build: builder → models → runtime.

```dockerfile
# ---------- stage 1: builder (deps) ------------------------------------------
FROM container-registry.ubs.net/python:3.12-slim AS builder

# UBS CA certs (org-wide, not scoped to AT/subscription)
ADD http://certinfo.ubs.com/aia/UBS_Server_CA_Production_4.crt /tmp/ca-certs/
ADD http://certinfo.ubs.com/aia/UBS_Server_CA_Production_5.crt /tmp/ca-certs/
RUN for F in /tmp/ca-certs/*.crt; do \
      openssl x509 -in $F -inform DER \
        -out /usr/local/share/ca-certificates/$(basename $F); \
    done && rm -rf /tmp/ca-certs && update-ca-certificates

# UBS internal pip registry
RUN pip config set global.index-url \
      'https://it4it-nexus-tp-repo.swissbank.com/repository/public-lib-python-pypi/simple' \
 && pip config set global.trusted-host 'it4it-nexus-tp-repo.swissbank.com'

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv==0.5.4
RUN uv venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" VIRTUAL_ENV=/opt/venv

WORKDIR /build
COPY pyproject.toml ./
RUN uv pip install --no-cache .

# ---------- stage 2: models (download at build time) -------------------------
FROM builder AS models

ENV HF_HOME=/app/.cache/huggingface \
    DOCMINING_ARTIFACTS_PATH=/app/.cache/docling/models \
    HF_HUB_DISABLE_TELEMETRY=1 \
    REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

RUN mkdir -p "$HF_HOME" "$DOCMINING_ARTIFACTS_PATH" \
 && docling-tools models download \
      layout tableformer code_formula picture_classifier rapidocr \
      -o "$DOCMINING_ARTIFACTS_PATH"

# ---------- stage 3: runtime -------------------------------------------------
FROM container-registry.ubs.net/python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" VIRTUAL_ENV=/opt/venv \
    HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 \
    HF_HUB_DISABLE_TELEMETRY=1 TOKENIZERS_PARALLELISM=false \
    DOCMINING_ARTIFACTS_PATH=/app/.cache/docling/models

RUN apt-get update && apt-get install -y --no-install-recommends \
      libgomp1 libgl1 libglib2.0-0 libxcb1 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1000 app \
 && useradd --uid 1000 --gid app --create-home --shell /sbin/nologin app

COPY --from=builder /opt/venv /opt/venv
COPY --from=models /app/.cache /app/.cache
WORKDIR /app
COPY --chown=app:app app/ /app/app/
COPY --chown=app:app pyproject.toml /app/

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request,sys; \
sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz',timeout=3).status==200 else 1)"

ENTRYPOINT ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--workers","1"]
```

### Key points

- **Models downloaded in `models` stage** — `docling-tools models download` calls HuggingFace at build time through UBS proxy
- **Runtime is fully offline** — `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`
- **UBS CA certs** — org-wide, not scoped to any AT/subscription
- **UBS Nexus** — pip packages from internal mirror
- **No `COPY models/`** — models never in git, never copied from local
- **Same model families** as FRAME3 reference: layout-heron, tableformer, code_formula, picture_classifier, rapidocr

## 7. Model Deployment Strategy (critical)

| Concern | Solution |
|---------|----------|
| Models can't go in git (1.2 GB) | Downloaded in Docker build `models` stage |
| HuggingFace blocked at runtime | `HF_HUB_OFFLINE=1` + `TRANSFORMERS_OFFLINE=1` |
| HuggingFace at build time in CI | Corporate proxy allows outbound from Kaniko; UBS CA certs added |
| pip packages from internal only | `pip config set global.index-url` to Nexus |
| No `models/` dir in CI workspace | `models` stage downloads fresh; `COPY --from=models` to runtime |
| Image size | ~4-5 GB expected (the "Docling tax" per FRAME3 blueprint) |

## 8. What to do on RDP

Once `frame-deploy/` is pushed to DevCloud GitLab:

1. CI pipeline triggers automatically per branch
2. `fetch_akv_secrets` gets AI keys from Azure Key Vault
3. `build_publish_snapshot_image` builds SPA via Kaniko
4. `build_docmining_image` builds DocMining via Kaniko (models downloaded here)
5. `setup-infra` creates namespaces + gateway
6. `deploy-*` Helm installs both services per branch → namespace

No manual steps. Push to `dev` → deploys to `frame-dev`. Push to `feature/*` → deploys to `frame-engg`. Push to `main` → deploys to `frame`.

## 9. Scope Guards

- DO NOT include docs/devlog/adr/kit-runner/powerstack4 in deploy folder
- DO NOT include `backend/docmining/models/` in git (downloaded at build time)
- DO NOT use Docker Hub base images (AKS Gatekeeper blocks them)
- DO NOT change the existing Helm template structure (services loop works for both)
- DO NOT include docker-compose/kind/local infra (local dev only)

---

**Status:** Design approved. Next step: `superpowers:writing-plans` to produce the build script that creates `frame-deploy/` from FRAME2.0.
