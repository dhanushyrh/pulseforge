# ════════════════════════════════════════════════════════════════
# Stage 1 — Build all NestJS apps
# ════════════════════════════════════════════════════════════════
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json nest-cli.json tsconfig*.json global.d.ts ./
RUN npm ci --frozen-lockfile

COPY apps/ apps/
COPY libs/ libs/

RUN npx nest build gateway          && \
    npx nest build worker-media     && \
    npx nest build worker-metadata  && \
    npx nest build worker-classifier && \
    npx nest build worker-embedding && \
    npx nest build worker-summary   && \
    npx nest build worker-insights  && \
    npx nest build worker-transcript


# ════════════════════════════════════════════════════════════════
# Stage 2 — Slim Node runtime (gateway + pure-Node workers)
# ════════════════════════════════════════════════════════════════
FROM node:22-slim AS node-runtime

WORKDIR /app
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules

# APP_NAME is set per-service in docker-compose (e.g. gateway, worker-media)
ENV NODE_ENV=production
CMD ["sh", "-c", "node dist/apps/${APP_NAME}/main.js"]


# ════════════════════════════════════════════════════════════════
# Stage 2b — Node runtime + yt-dlp (worker-media, worker-metadata)
# ════════════════════════════════════════════════════════════════
FROM node-runtime AS node-runtime-ytdlp

RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg \
    && python3 -m pip install --no-cache-dir --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

ENV YT_DLP_PATH=/usr/local/bin/yt-dlp


# ════════════════════════════════════════════════════════════════
# Stage 3 — Transcript worker (Node + Python + ffmpeg + tesseract)
#
#   Needs: faster-whisper (Whisper), yt-dlp (video download),
#          ffmpeg (audio extraction), tesseract (OCR on Linux),
#          opencv, rapidfuzz
# ════════════════════════════════════════════════════════════════
FROM node:22-slim AS worker-transcript

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv \
        ffmpeg \
        tesseract-ocr tesseract-ocr-eng \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules

# Install Python deps required by inline Whisper + OCR scripts
RUN python3 -m pip install --no-cache-dir --break-system-packages \
        faster-whisper \
        yt-dlp \
        opencv-python-headless \
        rapidfuzz \
        pytesseract \
        pillow

ENV NODE_ENV=production \
    PYTHON_PATH=/usr/bin/python3 \
    YT_DLP_PATH=/usr/local/bin/yt-dlp

CMD ["node", "dist/apps/worker-transcript/main.js"]
