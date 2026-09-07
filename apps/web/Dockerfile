# ==========================================
# EduSphere Web SPA — Production Dockerfile
# Multi-Stage, Alpine, Nginx-Served
# ==========================================

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/common ./packages/common
COPY packages/types ./packages/types
COPY apps/web ./apps/web

RUN npm ci
RUN npm run build --workspace=@edusphere/common
RUN npm run build --workspace=@edusphere/types
RUN npm run build --workspace=@edusphere/web

# ==========================================
# Production Runtime Stage (Nginx Alpine)
# ==========================================
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Custom Nginx SPA configuration
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
