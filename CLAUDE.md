# CLAUDE.md — PulseForge

## What this project is

PulseForge is a NestJS monorepo that ingests social media travel videos, extracts intelligence (transcript + OCR + description), embeds it into Qdrant, and surfaces structured travel data (places, stays, food, budget, itinerary) via a REST API.

---

## Build and run commands

```bash
# Install all Node deps (root only — monorepo, no nested installs)
npm install

# Run a specific NestJS app in watch mode
npx nest start gateway --watch
npx nest start worker-transcript

# Run all workers + gateway concurrently
npm run start:all

# Python sidecar (FastAPI)
cd apps/embedding-sidecar
venv/bin/uvicorn main:app --port 8001 --reload

# UI (Vite dev server on port 4000)
npm run start:ui

# Build all NestJS apps for production
npx nest build gateway
npx nest build worker-media
npx nest build worker-metadata
npx nest build worker-classifier
npx nest build worker-transcript
npx nest build worker-embedding
npx nest build worker-summary
npx nest build worker-insights

# Docker — full stack
docker compose up --build
# Infrastructure only (for local dev)
docker compose up postgres redis qdrant minio -d
```

---

## Repository layout

```
apps/
  gateway/              REST API — /v1/ingest, /v1/search, /v1/content
  ui/                   React + Vite SPA (port 4000)
  embedding-sidecar/    Python FastAPI (port 8001) — embeddings, OCR, LLM
  worker-media/         Downloads audio from URL → MinIO
  worker-metadata/      Runs yt-dlp --dump-json, persists to Job table
  worker-classifier/    LLM travel/non-travel gate; stops pipeline if not travel
  worker-transcript/    Whisper + frame OCR + description merge → rawText
  worker-embedding/     Chunks rawText, calls sidecar /embed/batch, stores in Qdrant
  worker-summary/       Calls Groq API → summary, sentiment, entities
  worker-insights/      Calls Groq API → structured JSON (stays/places/food/budget/itinerary)

libs/
  database/             TypeORM entities (Job, MediaAsset, Intelligence, ContentInsights)
                        DatabaseModule (used by every worker)
  queue/                QUEUES and JOBS constants; all job payload interfaces
```

---

## Key architectural patterns

### Queue-driven pipeline

Every stage is a BullMQ worker. When a stage completes it pushes to the next queue — it never calls the next service directly. Adding a new stage = add a new queue constant + new worker app + update the upstream processor to push to it.

Queue order: `MEDIA → METADATA → CLASSIFIER → TRANSCRIPT → (EMBEDDING + SUMMARY + INSIGHTS in parallel)`

### Shared payload types

All inter-worker data shapes live in `libs/queue/src/job-payloads.ts`. If you add a field to a payload, update that file and every place that constructs or consumes that payload type.

### Python inline scripts

The transcript worker runs Python via `execSync` for both Whisper and OCR rather than HTTP calls. Scripts are written to a temp file, executed with the venv Python, and cleaned up in `finally`. This avoids FastAPI startup cost for one-shot operations.

The venv Python is resolved at startup via `PYTHON_PATH` env var or by checking standard paths (`apps/embedding-sidecar/venv/bin/python3`, system `python3`).

### OCR platform detection

The inline OCR script branches on `platform.system()`:
- `Darwin` → Apple Vision (`pyobjc-framework-Vision`) — accurate on stylized social media text
- Linux (Docker) → `pytesseract` + system Tesseract

Do not use EasyOCR or PaddleOCR 3.x — neither supports Python 3.13 (no torch/paddlepaddle wheel).

### rawText merge format

The transcript worker merges three text sources into a single `rawText` before dispatching to downstream workers. Downstream workers receive only `rawText` — they do not know its composition.

```
<whisper transcript>

[Description]:
<useful lines from yt-dlp description — hashtag/URL-only lines stripped>

[On-screen text]:
<OCR hits, pipe-separated>
```

---

## Environment variables

| Variable | Default | Used by |
|---|---|---|
| `DB_HOST` | localhost | all workers, gateway |
| `DB_PORT` | 5432 | all workers, gateway |
| `DB_USER` | pulseforge | all workers, gateway |
| `DB_PASSWORD` | pulseforge | all workers, gateway |
| `DB_NAME` | pulseforge | all workers, gateway |
| `REDIS_HOST` | localhost | all workers, gateway |
| `REDIS_PORT` | 6379 | all workers, gateway |
| `MINIO_ENDPOINT` | localhost | worker-media, worker-transcript |
| `MINIO_PORT` | 9000 | worker-media, worker-transcript |
| `MINIO_ACCESS_KEY` | minioadmin | worker-media, worker-transcript |
| `MINIO_SECRET_KEY` | minioadmin | worker-media, worker-transcript |
| `MINIO_BUCKET` | pulseforge-media | worker-media |
| `QDRANT_HOST` | localhost | worker-embedding |
| `QDRANT_PORT` | 6333 | worker-embedding |
| `GROQ_API_KEY` | — | worker-summary, worker-insights |
| `EMBEDDING_SIDECAR_URL` | http://localhost:8001 | worker-embedding, worker-classifier |
| `PYTHON_PATH` | auto-resolved | worker-transcript |
| `YT_DLP_PATH` | auto-resolved | worker-media, worker-transcript |
| `GATEWAY_PORT` | 3000 | gateway |

---

## Adding a new worker

1. Add queue name + job constant to `libs/queue/src/queues.constants.ts`
2. Add payload interface to `libs/queue/src/job-payloads.ts`
3. Export from `libs/queue/src/index.ts`
4. Create `apps/worker-<name>/src/` with `app.module.ts`, `main.ts`, `<name>.processor.ts`, `<name>.service.ts`
5. Add `tsconfig.app.json` (copy from any other worker)
6. Register the project in `nest-cli.json`
7. Add `start:<name>` script to `package.json`
8. Update the upstream processor to push to the new queue
9. Add service to `docker-compose.yaml` using the `node-runtime` target

---

## Database entities

| Entity | Table | Purpose |
|---|---|---|
| `Job` | `job` | Tracks a single URL submission through the pipeline — status, metadata, creator, country, etc. |
| `MediaAsset` | `media_asset` | MinIO storage path for the downloaded audio file |
| `Intelligence` | `intelligence` | `rawText` (merged), `ocrText`, `summary`, `sentiment`, `entities` |
| `ContentInsights` | `content_insights` | Structured JSON (stays, places, food, budget, itinerary) |

TypeORM is in `synchronize: true` mode — schema auto-migrates on startup. For production, switch to migrations.

---

## Python sidecar endpoints

| Endpoint | Input | Purpose |
|---|---|---|
| `POST /embed` | `{ text }` | Single text → 384-dim embedding vector |
| `POST /embed/batch` | `{ texts[] }` | Batch embedding |
| `POST /classify` | `{ text }` | Travel/non-travel classification (Qwen2.5-0.5B) |
| `POST /extract-insights` | `{ text, country, content_type }` | Structured insight extraction |
| `POST /summarize` | `{ prompt }` | Generic summarization |
| `POST /ocr-frames` | `{ video_path, sample_interval_sec, roi_start }` | Frame-sampled OCR on a local video file |

---

## Gotchas

- **yt-dlp file extensions**: yt-dlp chooses the extension freely (`.webm`, `.mp4`, `.mkv`). Always use `%(ext)s` in the output template and find the actual file with `readdirSync` after download.
- **PaddleOCR 3.x**: requires `paddlepaddle` which has no Python 3.13 wheel. Do not upgrade.
- **EasyOCR**: requires PyTorch which has no Python 3.13 wheel. Do not install.
- **TypeORM synchronize**: is `true` — changing an entity adds/alters columns on next boot. Safe in dev, risky in prod with data.
- **BullMQ lock duration**: the transcript worker sets `lockDuration: 300_000` and manually extends the lock. Whisper + video download + OCR can take > 5 minutes on CPU. Do not reduce this.
- **Groq API key**: required for `worker-summary` and `worker-insights`. Without it those workers will fail silently and the job will stay incomplete (not `failed` — add explicit error handling if needed).
