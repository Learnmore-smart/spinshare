# ── Stage 1: deps ──────────────────────────────────────────
FROM node:20-slim AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY web/package.json web/

RUN pnpm install --frozen-lockfile

# ── Stage 2: builder ───────────────────────────────────────
FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules

COPY packages/core ./packages/core
COPY web ./web
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Build core first (web depends on it)
RUN pnpm --filter @spinshare/core build

# Build web — NEXT_PUBLIC_* must be present at build time (not Cloud Run runtime).
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @spinshare/web build

# ── Stage 3: runner ────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./web/.next/static
COPY --from=builder /app/web/public ./web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "web/server.js"]
