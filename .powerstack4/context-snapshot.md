# Context Snapshot
## Last Updated: 2026-04-25T12:10:00Z
## Active Task: Phase C-Local complete — multi-env deployment verified
## Current Phase: Phase C-Local DONE, kit-runner skill DONE

## Branch Layout
- `main` (88ed7ca) — stable, pre-DocMining
- `dev` (2f85269) — development branch with full infra
- `feature/phase-a-docmining` (2f85269) — current feature branch

## Local Environment (kind cluster "frame")
- `frame.local:8080` → namespace `frame` (main)
- `frame-dev.local:8080` → namespace `frame-dev` (dev)
- `frame-engg.local:8080` → namespace `frame-engg` (feature)
- 9 pods total (3 per namespace: 1 docmining + 2 SPA replicas)
- All E2E checks passing (healthz, /frame/, PDF convert)

## Key Files Created This Session
- `backend/docmining/Dockerfile` + `.dockerignore`
- `Dockerfile` (SPA) + `nginx.conf` + `.dockerignore` (root)
- `src/FederatedApp.tsx` — federation entry re-export
- `docker-compose.yml` + `infra/local-proxy/nginx.conf`
- `charts/frame-docmining/`, `charts/frame-spa/`, `charts/frame-ingress/`
- `infra/kind/cluster.yaml` + `infra/local/deploy-all.sh`
- `AGENTS.md`, `docs/adr/`, `docs/devlog/`, `.claude/commands/`, `.claude/rules/`
- Kit-runner skill: `~/.claude/skills/kit-runner/` (16 commits, 14+9 tests)

## Gotchas Discovered
- Docling 2.90 lazy-imports rapidocr without declaring it — must add to pyproject.toml
- cv2 (via rapidocr) needs libgl1/libglib2.0-0/libxcb1 in python:3.12-slim runtime
- `npm run build` = `tsc -b && vite build` — tsc fails on test files in Docker; use `npx vite build` directly
- vite.config.ts references `src/FederatedApp.tsx` but file didn't exist — created re-export wrapper
- nginx ingress rewrite-target is per-Ingress-resource, not per-path — split into 3 Ingress resources
- macOS ships bash 3.2 — no `declare -A` associative arrays; use case/function pattern instead

## Next Steps
- Run existing test suite to confirm no regressions: `npm run test:run`
- Merge `feature/phase-a-docmining` → `dev` when ready
- Phase C-AKS (RDP): `docker buildx --platform linux/amd64`, ACR push, helm install against AKS
