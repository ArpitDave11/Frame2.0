#!/usr/bin/env bash
set -euo pipefail
#
# deploy-all.sh — Deploy FRAME to all 3 namespaces in a local kind cluster.
#
# Mirrors the RDP/AKS layout:
#   frame.local       → namespace: frame        (main branch)
#   frame-dev.local   → namespace: frame-dev     (dev branch)
#   frame-engg.local  → namespace: frame-engg    (feature branch)
#
# Usage:
#   bash infra/local/deploy-all.sh [up|down|status|build]
#
# Prerequisites:
#   - Docker running
#   - kind, helm, kubectl installed
#   - /etc/hosts has: 127.0.0.1 frame.local frame-dev.local frame-engg.local
#

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLUSTER_NAME="frame"
KIND_CONFIG="${REPO_ROOT}/infra/kind/cluster.yaml"

# Environment definitions (POSIX-compatible — no associative arrays)
NAMESPACES="frame frame-dev frame-engg"
HOSTS_frame="frame.local"
HOSTS_frame_dev="frame-dev.local"
HOSTS_frame_engg="frame-engg.local"

# Resolve host for a namespace
get_host() {
  case "$1" in
    frame)      echo "${HOSTS_frame}" ;;
    frame-dev)  echo "${HOSTS_frame_dev}" ;;
    frame-engg) echo "${HOSTS_frame_engg}" ;;
  esac
}

DM_IMAGE="frame-docmining:dev"
SPA_IMAGE="frame-spa:dev"

usage() {
  echo "Usage: $0 [up|down|status|build]"
  echo ""
  echo "  build   — Build Docker images only"
  echo "  up      — Create cluster, install ingress-nginx, deploy all 3 envs"
  echo "  down    — Delete the kind cluster"
  echo "  status  — Show pods/ingress across all namespaces"
  exit 1
}

check_hosts() {
  for host in frame.local frame-dev.local frame-engg.local; do
    if ! grep -q "${host}" /etc/hosts 2>/dev/null; then
      echo ""
      echo "Missing /etc/hosts entries. Run:"
      echo "  sudo bash -c 'echo \"127.0.0.1 frame.local frame-dev.local frame-engg.local\" >> /etc/hosts'"
      exit 1
    fi
  done
}

do_build() {
  echo "=== Building Docker images ==="
  cd "${REPO_ROOT}"
  docker build -t "${DM_IMAGE}" backend/docmining
  docker build -t "${SPA_IMAGE}" .
  echo "=== Images built ==="
}

do_up() {
  check_hosts

  # Create cluster if it doesn't exist
  if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo "=== Creating kind cluster '${CLUSTER_NAME}' ==="
    kind create cluster --name "${CLUSTER_NAME}" --config "${KIND_CONFIG}"
  else
    echo "=== Cluster '${CLUSTER_NAME}' already exists ==="
  fi

  # Install ingress-nginx if not present
  if ! kubectl get namespace ingress-nginx >/dev/null 2>&1; then
    echo "=== Installing ingress-nginx ==="
    kubectl apply -f https://kind.sigs.k8s.io/examples/ingress/deploy-ingress-nginx.yaml
    echo "Waiting for ingress controller..."
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=120s
  else
    echo "=== ingress-nginx already installed ==="
  fi

  # Load images into kind
  echo "=== Loading images into kind ==="
  kind load docker-image "${DM_IMAGE}" "${SPA_IMAGE}" --name "${CLUSTER_NAME}"

  # Deploy to each namespace
  for ns in ${NAMESPACES}; do
    host=$(get_host "${ns}")
    echo ""
    echo "=== Deploying to namespace: ${ns} (host: ${host}) ==="

    kubectl create namespace "${ns}" 2>/dev/null || true

    # Helm install/upgrade docmining
    if helm status "dm" -n "${ns}" >/dev/null 2>&1; then
      helm upgrade dm "${REPO_ROOT}/charts/frame-docmining" -n "${ns}" \
        --set image.repository=frame-docmining --set image.tag=dev \
        --set image.pullPolicy=IfNotPresent
    else
      helm install dm "${REPO_ROOT}/charts/frame-docmining" -n "${ns}" \
        --set image.repository=frame-docmining --set image.tag=dev \
        --set image.pullPolicy=IfNotPresent
    fi

    # Helm install/upgrade spa
    if helm status "spa" -n "${ns}" >/dev/null 2>&1; then
      helm upgrade spa "${REPO_ROOT}/charts/frame-spa" -n "${ns}" \
        --set image.repository=frame-spa --set image.tag=dev \
        --set image.pullPolicy=IfNotPresent
    else
      helm install spa "${REPO_ROOT}/charts/frame-spa" -n "${ns}" \
        --set image.repository=frame-spa --set image.tag=dev \
        --set image.pullPolicy=IfNotPresent
    fi

    # Helm install/upgrade ingress with the per-env host
    if helm status "ingress" -n "${ns}" >/dev/null 2>&1; then
      helm upgrade ingress "${REPO_ROOT}/charts/frame-ingress" -n "${ns}" \
        --set host="${host}" \
        --set docmining.serviceName=dm-frame-docmining \
        --set spa.serviceName=spa-frame-spa
    else
      helm install ingress "${REPO_ROOT}/charts/frame-ingress" -n "${ns}" \
        --set host="${host}" \
        --set docmining.serviceName=dm-frame-docmining \
        --set spa.serviceName=spa-frame-spa
    fi
  done

  echo ""
  echo "=== Waiting for rollouts ==="
  for ns in ${NAMESPACES}; do
    kubectl -n "${ns}" rollout status deploy/dm-frame-docmining --timeout=300s
    kubectl -n "${ns}" rollout status deploy/spa-frame-spa --timeout=120s
  done

  echo ""
  echo "========================================="
  echo "  All 3 environments deployed!"
  echo ""
  echo "  http://frame.local:8080/frame/       — main"
  echo "  http://frame-dev.local:8080/frame/   — dev"
  echo "  http://frame-engg.local:8080/frame/  — feature"
  echo ""
  echo "  Healthz:"
  echo "  curl -fs http://frame.local:8080/api/docmining/healthz"
  echo "  curl -fs http://frame-dev.local:8080/api/docmining/healthz"
  echo "  curl -fs http://frame-engg.local:8080/api/docmining/healthz"
  echo "========================================="
}

do_down() {
  echo "=== Deleting kind cluster '${CLUSTER_NAME}' ==="
  kind delete cluster --name "${CLUSTER_NAME}"
  echo "Done."
}

do_status() {
  for ns in ${NAMESPACES}; do
    host=$(get_host "${ns}")
    echo "=== ${ns} (${host}) ==="
    kubectl -n "${ns}" get pods 2>/dev/null || echo "  (namespace not found)"
    kubectl -n "${ns}" get ingress 2>/dev/null || true
    echo ""
  done
}

case "${1:-}" in
  build)  do_build ;;
  up)     do_up ;;
  down)   do_down ;;
  status) do_status ;;
  *)      usage ;;
esac
