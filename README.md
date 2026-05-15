# PulseForge

Semantic intelligence engine for social media travel content. Submit a YouTube, Instagram Reel, or TikTok URL and PulseForge automatically extracts the transcript, on-screen text, and video description, then stores structured insights (places, stays, food, itineraries, budget) alongside searchable vector embeddings.

---

## How it works

```
URL submitted
     │
     ▼
[worker-media]       Downloads audio → MinIO
     │
     ▼
[worker-metadata]    Extracts yt-dlp metadata (title, creator, country, chapters, tags, description)
     │
     ▼
[worker-classifier]  LLM gate — stops non-travel content here
     │
     ▼
[worker-transcript]  Whisper transcription  +  frame-sampled OCR (2s interval, full frame)
                     Merges: transcript + description + on-screen text → rawText
     │
     ├──► [worker-embedding]   Chunks rawText → sentence-transformers → Qdrant
     ├──► [worker-summary]     Groq LLM → summary, sentiment, entities
     └──► [worker-insights]    Groq LLM → stays, places, food, budget, itinerary (structured JSON)
```

All queues are BullMQ on Redis. The gateway exposes REST + Swagger + BullBoard.

---

## Tech stack

| Layer | Technology |
|---|---|
| API Gateway | NestJS (Node 22) |
| Queue | BullMQ + Redis 7 |
| Database | PostgreSQL 16 + TypeORM |
| Vector store | Qdrant |
| Object storage | MinIO |
| Transcription | faster-whisper (base model, CPU) |
| OCR | Apple Vision (macOS) / Tesseract (Linux/Docker) |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 via ONNX |
| LLM | Groq API (summary/insights) + Qwen2.5-0.5B CPU (classification) |
| Frontend | React + Vite (port 4000) |
| Python sidecar | FastAPI (port 8001) |

---

## Prerequisites

**Local dev (macOS)**

- Node 22, npm 11
- Python 3.13 with a venv at `apps/embedding-sidecar/venv/`
- `brew install yt-dlp ffmpeg tesseract`
- PostgreSQL, Redis, Qdrant, MinIO (start with Docker below)

**Docker**

- Docker + Docker Compose v2

---

## Quick start

### 1. Start infrastructure

```bash
docker compose up postgres redis qdrant minio -d
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Set up Python sidecar

```bash
cd apps/embedding-sidecar
python3 -m venv venv
venv/bin/pip install -r requirements.txt
# macOS only — Apple Vision OCR:
venv/bin/pip install pyobjc-framework-Vision
```

### 4. Set environment variables

Create a `.env` file in the project root:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=pulseforge
DB_PASSWORD=pulseforge
DB_NAME=pulseforge

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=pulseforge-media

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# LLM
GROQ_API_KEY=gsk_...

# Sidecar
EMBEDDING_SIDECAR_URL=http://localhost:8001
```

### 5. Run everything

```bash
# Terminal 1 — Python sidecar
cd apps/embedding-sidecar && venv/bin/uvicorn main:app --port 8001 --reload

# Terminal 2 — All NestJS workers + gateway
npm run start:all

# Terminal 3 — UI dev server
npm run start:ui
```

---

## Docker (full stack)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| UI | http://localhost:4000 |
| Gateway API | http://localhost:3000 |
| Swagger | http://localhost:3000/api |
| BullBoard | http://localhost:3000/queues |
| Python sidecar | http://localhost:8001 |
| MinIO console | http://localhost:9001 |

---

## API

### `POST /v1/ingest`

Submit a URL for processing.

```json
{ "url": "https://www.youtube.com/watch?v=..." }
```

Response `202`:

```json
{ "jobId": "uuid", "status": "queued" }
```

### `GET /v1/ingest/:jobId/status`

Poll processing status. Values: `queued → processing → completed | not_travel | failed`

### `POST /v1/search`

Semantic search over all ingested content.

```json
{ "query": "budget ramen in Tokyo under $10" }
```

---

## Project structure

```
pulseforge/
├── apps/
│   ├── gateway/              # REST API + BullBoard
│   ├── ui/                   # React + Vite frontend
│   ├── embedding-sidecar/    # Python FastAPI — embeddings, OCR, LLM ops
│   ├── worker-media/         # Downloads audio → MinIO
│   ├── worker-metadata/      # yt-dlp metadata extraction
│   ├── worker-classifier/    # Travel content gate (LLM)
│   ├── worker-transcript/    # Whisper + OCR + text merge
│   ├── worker-embedding/     # Chunks rawText → Qdrant
│   ├── worker-summary/       # Summary + sentiment (Groq)
│   └── worker-insights/      # Structured travel data (Groq)
├── libs/
│   ├── database/             # TypeORM entities + DatabaseModule
│   └── queue/                # Queue names, job constants, shared payload types
├── Dockerfile                # Multi-stage: builder → node-runtime → worker-transcript
├── docker-compose.yaml
└── nest-cli.json
```

---

## Individual worker scripts

```bash
npm run start:gateway       # API gateway  — port 3000
npm run start:media         # worker-media
npm run start:metadata      # worker-metadata
npm run start:classifier    # worker-classifier
npm run start:transcript    # worker-transcript
npm run start:embedding     # worker-embedding
npm run start:summary       # worker-summary
npm run start:insights      # worker-insights
npm run start:ui            # Vite dev server — port 4000
npm run start:all           # All of the above concurrently
```

---

## Intelligence pipeline — text sources

The `rawText` stored per video is the union of three sources:

| Source | How |
|---|---|
| Whisper transcript | Speech-to-text from the audio track (base model, CPU) |
| Video description | Creator-written description; hashtag/mention/URL-only lines stripped |
| On-screen OCR | Sampled every 2 seconds, full frame, deduped with RapidFuzz (ratio > 80) |

Merged format stored in the `intelligence` table:

```
<whisper transcript>

[Description]:
Day 1 Tokyo — hotel ¥6,500/night, Tsukiji breakfast ¥800...

[On-screen text]:
Shinjuku Station | ¥900 ramen | Day 2 Itinerary...
```

---

## Structured insights schema

```json
{
  "stays":     [{ "name": "", "location": "", "pricePerNight": "", "type": "hotel", "notes": "" }],
  "places":    [{ "name": "", "category": "landmark", "notes": "", "mustVisit": true }],
  "food":      [{ "name": "", "restaurant": "", "price": "", "rating": "", "notes": "" }],
  "budget":    [{ "category": "food", "amount": "900", "currency": "JPY", "notes": "" }],
  "itinerary": [{ "day": 1, "title": "", "stops": [{ "time": "", "description": "", "place": "" }] }],
  "currency":  "JPY",
  "hasItinerary": true
}
```
