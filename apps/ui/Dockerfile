# ── Stage 1: Build the React app ────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install root workspace deps (vite, react, etc. are in root package.json)
COPY package*.json tsconfig*.json ./
RUN npm ci --frozen-lockfile

COPY apps/ui/ apps/ui/
COPY libs/     libs/

RUN npm run build:ui


# ── Stage 2: Serve with nginx ────────────────────────────────
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist/ui /usr/share/nginx/html
COPY apps/ui/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
