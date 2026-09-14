# syntax=docker/dockerfile:1.12

# ---------------------------------------------------------------------------
# Stage 1: dependencies (full, including dev) for building.
# Pinned by digest in CI via Renovate; tag kept here for readability.
# ---------------------------------------------------------------------------
FROM node:26.8-bookworm-slim AS deps
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: build the application bundle with tsup.
# ---------------------------------------------------------------------------
FROM node:26.8-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# ---------------------------------------------------------------------------
# Stage 3: production dependencies only (prune dev deps).
# ---------------------------------------------------------------------------
FROM node:26.8-bookworm-slim AS prod-deps
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---------------------------------------------------------------------------
# Stage 4: minimal distroless runtime. Non-root, read-only rootfs friendly.
# ---------------------------------------------------------------------------
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    LOG_PRETTY=false

WORKDIR /app

# Distroless already runs as the "nonroot" (uid 65532) user.
COPY --from=prod-deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --chown=nonroot:nonroot package.json ./

EXPOSE 3000

# The distroless nodejs image's entrypoint is "node"; we pass the script only.
# Healthcheck uses node's fetch (Node 22) to hit the liveness probe.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["dist/server.js", "--healthcheck"] || exit 1

USER nonroot:nonroot

CMD ["dist/server.js"]
