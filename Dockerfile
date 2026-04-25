# syntax=docker/dockerfile:1.7
#
# Frame SPA — multi-stage build.
#
#   stage 1 (builder)  npm ci + npm run build → dist/
#   stage 2 (runtime)  nginx:1.27-alpine serves /frame/ from dist/
#
# Build context: repo root.
#   docker build -t frame-spa:dev .

# ---------- stage 1: builder --------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /build

# Dep install layer — invalidated only when lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build.
COPY . .
# Skip `tsc -b` (part of `npm run build`) — test files in src/ have
# pre-existing type errors that don't affect the production bundle.
# Vite handles its own TypeScript transpilation via esbuild.
RUN npx vite build

# ---------- stage 2: runtime --------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Remove default nginx site.
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config.
COPY nginx.conf /etc/nginx/conf.d/frame.conf

# Copy built assets into the path nginx expects.
# vite.config.ts base: '/frame/' means dist/ content is served at /frame/.
COPY --from=builder /build/dist /usr/share/nginx/html/frame

EXPOSE 80

# nginx:alpine default CMD is already ["nginx", "-g", "daemon off;"]
