# ==========================================
# EduSphere API — Production Dockerfile
# Multi-Stage, Alpine, Non-Root Execution
# ==========================================

FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy repository structure for workspace resolution
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/common ./packages/common
COPY packages/types ./packages/types
COPY apps/api ./apps/api

# Install dependencies and build shared packages
RUN npm ci

# Build shared packages and API
RUN npm run build --workspace=@edusphere/common
RUN npm run build --workspace=@edusphere/types
RUN npm run build --workspace=@edusphere/api

# ==========================================
# Production Runtime Stage
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=5000

# Run as unprivileged user
USER node

COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages/common/dist ./packages/common/dist
COPY --chown=node:node --from=builder /app/packages/common/package.json ./packages/common/package.json
COPY --chown=node:node --from=builder /app/packages/types/dist ./packages/types/dist
COPY --chown=node:node --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/api/dist/server.js"]
