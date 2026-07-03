# CuraVision

CuraVision is a multi-service project that combines a web app, an API layer, an AI microservice, an async worker, and machine learning training code in a single monorepo.

## Monorepo Layout

```text
GP/
├── frontend/             # Next.js 16 + React 19 + TS 6 + Tailwind 4 (patient + doctor portals)
├── backend/              # Node.js + Express 5 + Prisma 7 REST API
│   └── prisma/           # PostgreSQL schema + migrations + seed
├── ai-service/           # FastAPI service (RAG chatbot, segmentation/Grad-CAM/report stubs)
│   └── app/worker/       # Celery worker (run_full_analysis chain)
├── ml/                   # ML training/inference code and datasets
├── scripts/              # Standalone scripts and prototypes
├── docs/                 # Product and design documentation
├── docker-compose.yml    # Full stack: frontend, backend, ai-service, postgres, redis, chromadb, minio
├── .github/workflows/    # CI: lint + build + tests
└── README.md
```

## Services at a Glance

| Service       | Stack                                                  | Default Port |
|---------------|--------------------------------------------------------|--------------|
| Frontend      | Next.js 16, React 19, TypeScript 6, Tailwind 4         | 3000         |
| Backend API   | Node.js 20+, Express 5, Prisma 7                       | 3001         |
| AI Service    | FastAPI 0.136, Pydantic 2.13, ChromaDB 1.5, Groq 1.2   | 8001         |
| Celery Worker | Celery + Redis                             | —            |
| PostgreSQL    | Docker (`curavision-postgres`)             | 5432         |
| Redis         | Docker (`curavision-redis`)                | 6379         |
| ChromaDB      | Docker (`curavision-chromadb`) — RAG store | 8000         |
| MinIO         | Docker (`curavision-minio`) — S3 storage   | 9000 / 9001  |

## Prerequisites

- Node.js 20+ and npm (Next.js 16 / React 19 require Node 20)
- Python 3.11+ (tested on 3.13 with NumPy 2.4 / Pydantic 2.13)
- Docker + Docker Compose (for Postgres / Redis)
- Git

---

## Quick start — local MVP

```bash
# 1. Infra (Postgres + Redis)
docker compose up -d

# 2. Backend & Database Setup
cd backend
cp .env.example .env
npm install
# Run Prisma migrations to initialize the PostgreSQL database and seed demo data
npx prisma migrate dev --name init
npm run db:seed
npm run dev            # http://localhost:3001

# 3. AI service (new terminal)
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001

# 4. Celery worker (optional, new terminal)
cd ai-service && source .venv/bin/activate
celery -A app.worker.celery_app.celery worker --loglevel=info

# 5. Frontend (new terminal)
cd frontend
npm install
npm run dev            # http://localhost:3000
```

The frontend reads `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:3001`).

Seeded demo accounts (in-memory mock data):

| Role    | Email                         | Password       |
|---------|-------------------------------|----------------|
| Patient | `patient1@curavision.com`     | `Patient@123`  |
| Doctor  | `doctor@curavision.com`       | `Doctor@123`   |
| Admin   | `admin@curavision.com`        | `Admin@123`    |

---

## Backend API (selected endpoints)

See `docs/CuraVision-SDD.md` §5 for the full contract.

- `POST /api/auth/register` — self-register (Patient or Doctor)
- `POST /api/auth/login` — returns `{ token, user }`
- `POST /api/scans` — multipart DICOM upload (doctor only)
- `GET  /api/scans` — doctor's scans
- `GET  /api/scans/:id` — scan metadata + status
- `GET  /api/scans/:id/analysis` — segmentation + Grad-CAM
- `GET  /api/scans/:id/report` — draft / published report
- `PATCH /api/reports/:id` — doctor edits final report
- `POST /api/reports/:id/approve` — publish to patient
- `GET  /api/patient/reports` — patient's published reports
- `POST /api/chat/:reportId/message` — grounded chatbot
- `GET  /api/reservations`, `POST /api/reservations` — appointments
- `PATCH /api/reservations/:id` — confirm / cancel / complete
- `GET  /api/doctors/:id/availability` — free slots
- `GET  /api/reports/:id/corrections` — HITL correction history
- `GET  /api/admin/audit-logs`, `GET /api/admin/users` (admin only)

Security middleware:

- **CORS**: `CORS_ORIGIN` accepts a comma-separated allowlist (defaults to
  `http://localhost:3000`). Use `*` only in development.
- **Rate limits**: generic `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` for
  `/api/*` and stricter `AUTH_RATE_LIMIT_*` for `/api/auth/*` brute-force
  protection. All values in `backend/.env.example`.
- **Request validation**: every mutating endpoint uses `express-validator`.

Smoke-test the full flow:

```bash
# with the backend running on :3001
cd backend
node tests/smoke-mvp.js
```

---

## Running the whole stack with Docker Compose

```bash
docker compose up -d --build   # builds + starts everything
docker compose ps              # status per service
docker compose logs -f backend # tail logs
docker compose down -v         # nuke data volumes
```

Ports (host-mapped):

| Service       | URL                          |
|---------------|------------------------------|
| Frontend      | http://localhost:3000        |
| Backend       | http://localhost:3001        |
| AI service    | http://localhost:8001        |
| ChromaDB      | http://localhost:8000        |
| MinIO (S3)    | http://localhost:9000        |
| MinIO console | http://localhost:9001        |
| Postgres      | localhost:5432               |
| Redis         | localhost:6379               |

The `minio-bootstrap` one-shot container creates the `curavision` bucket on
first run. Object-storage creds default to `curavision` / `curavision` and can
be overridden via env.

---

## Tests

Each service ships its own test suite. They all run in CI and can be run
locally with the same commands:

```bash
# Backend — route tests (node:test + supertest, in-process, no network)
cd backend && npm test

# AI service — FastAPI contract tests (LLM/Chroma stubbed)
cd ai-service
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q tests/

# Frontend — production smoke (builds standalone, boots, probes routes)
cd frontend
npm run build
npm run test:smoke
```

### CI

`.github/workflows/ci.yml` runs four parallel jobs on every push / PR:

1. **backend** — `node --check` lint + route tests
2. **ai-service** — `compileall` syntax check + pytest
3. **frontend** — ESLint + `tsc --noEmit` + `next build` + smoke test
4. **docker-build** — verifies every service image builds (buildx cache)

---

## Database — Prisma + PostgreSQL

The Prisma schema (`backend/prisma/schema.prisma`) maps 1:1 to SDD §4:
users, patients, doctors, scans, scan_analysis, reports, corrections,
reservations, doctor_availability, audit_logs, chat_sessions, chat_messages.

```bash
cd backend
npx prisma migrate dev --name init   # apply schema
npx prisma generate                  # regenerate typed client
npm run db:seed                      # load demo users/reports into Postgres
```

Until migrations are applied, the backend falls back to the in-memory
fixtures under `backend/src/mockData/`, so the rest of the stack keeps
working without Postgres.

---

## Async analysis (Celery + Redis)

The Celery task graph that implements SDD §7 lives in
`ai-service/app/worker/`:

- `celery_app.py` — broker/backend configuration
- `tasks.py` — `segmentation_task`, `gradcam_task`, `report_task`,
  `run_full_analysis`

Enqueue a job from any Python shell while the worker is running:

```python
from app.worker.tasks import run_full_analysis
result = run_full_analysis.delay("scan-123", "storage/dicoms/scan-123/file.dcm")
print(result.get(timeout=60))
```

The Node backend currently calls the FastAPI `/ai/analyze` endpoint
synchronously and falls back to a deterministic local stub if the
service is unreachable. Switching to Celery is a one-line change in
`backend/src/services/ScanService.js`.

---

## Frontend highlights

- **Real auth**: `src/lib/apiClient.ts` attaches `Authorization: Bearer` from `localStorage`. `src/lib/authContext.tsx` provides `useAuth()` and `useRequireAuth(role)` helpers.
- **Patient portal**: Contains dynamic dashboard, reports (fetched from `/api/patient/reports`), and a chatbot wired to `/api/chat/:reportId/message` complete with source citations.
- **Doctor portal** (`/doctor`): Features a complete clinical dashboard, scan lists, scan upload tools, and an advanced review panel rendering Grad-CAM heatmaps beside native DICOM scans (with dynamic overlay opacity controls).
- **Premium Appointment Scheduler**: The doctor appointments manager is rebuilt as a premium Medical SaaS dashboard. It displays detailed queues, upcoming appointments, actions to approve or cancel slots, and direct patient navigation.
- **Clinical Review Queue**: Fully integrated review list connecting real backend API endpoints to the Cornerstone-powered `DicomViewer` for scan assessments.
- **DICOM viewer**: `src/components/medical/DicomViewer.tsx` dynamically imports `@cornerstonejs/core` on the client, offering tools for zooming, panning, contrast adjustment, slice navigation, and toggleable AI mask layers, falling back to a clean `<img>` rendering for PNG/JPEG previews (e.g., Grad-CAM heatmaps).

> **Note (Next.js 16):** dev/build use the webpack backend
> (`next dev --webpack`, `next build --webpack`) because Cornerstone's WASM
> codecs reference Node built-ins that need `resolve.fallback` — an option
> Turbopack doesn't yet expose. Switch back to Turbopack once it does.

---

## AI Service (`ai-service/`)

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

Endpoints:

- `POST /ai/chatbot` — RAG-grounded answers for patient questions
- `POST /ai/segmentation` — U-Net stub (returns deterministic mask path + volume)
- `POST /ai/gradcam` — Grad-CAM stub
- `POST /ai/report` — LLM report draft stub
- `POST /ai/analyze` — full pipeline in one call

Swap the stubs in `app/services/analysis_service.py` when the trained
weights are ready.

### LLM provider switch (Groq / Ollama)

`app/services/llm_service.py` is provider-agnostic. Select a backend via
the `LLM_PROVIDER` env var:

- `LLM_PROVIDER=groq` (default) — hosted Groq API. Requires `GROQ_API_KEY`
  and optionally `GROQ_MODEL`.
- `LLM_PROVIDER=ollama` — local Ollama server (matches the on-prem story
  in the PRD/SDD). Point `OLLAMA_BASE_URL` at a running `ollama serve`
  and pick a pulled model via `OLLAMA_MODEL` (e.g. `llama3`, `mistral`).

The chatbot code path is identical for both; only the completion call
changes. See `ai-service/.env.example` for the full variable list.

---

## ML Scripts (`ml/`)

```bash
cd ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python src/run_train.py
python src/run_test.py
```

`ml/data/` and `ml/checkpoints/` are intentionally untracked.

---

## Documentation

- [`docs/CuraVision-PRD.md`](docs/CuraVision-PRD.md) — Product Requirements Document
- [`docs/CuraVision-SDD.md`](docs/CuraVision-SDD.md) — Software Design Document

## Environment and Secrets

- Do not commit `.env` files; each service has `.env.example`.
- `backend/storage/` is where DICOMs and generated masks/heatmaps land;
  it is served read-only at `GET /storage/...` for the DICOM viewer in
  local development. Replace with signed object-storage URLs for prod.

## Production Deployment

CuraVision can be run in production using the production Docker Compose configurations, which set up a secure reverse proxy (Nginx) terminating SSL/TLS and route requests internally without exposing backend ports directly.

### 1. Nginx Reverse Proxy & TLS Configuration
A reverse proxy is defined in `docker-compose.prod.yml` to terminate TLS/SSL.
1. Place your SSL certificate and private key in the `nginx/certs/` directory as `curavision.crt` and `curavision.key`.
   - For local verification, you can generate self-signed certificates:
     ```bash
     mkdir -p nginx/certs
     openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
       -keyout nginx/certs/curavision.key \
       -out nginx/certs/curavision.crt \
       -subj "/CN=localhost"
     ```
2. Start the stack in production mode (this will pull in the base configurations but ignore port exposures, routing everything through Nginx on ports 80/443 instead):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```

### 2. Environment Variables & Secrets Management
In production, do not use fallback defaults. You must set the following environment variables (e.g., in a `.env` file in the root):
- `POSTGRES_USER`: The production database username.
- `POSTGRES_PASSWORD`: A secure database password.
- `POSTGRES_DB`: The production database name.
- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`: Secure root credentials for MinIO object storage.
- `JWT_SECRET`: A secure, random string used to sign JWT tokens. **The backend will fail to start if this is unset or set to development placeholders.**
- `CORS_ORIGIN`: Comma-separated list of allowed origins.
- `CORS_ORIGINS` (AI Service): Comma-separated list of allowed origins (the backend host).

GitHub Actions secrets for CD (Settings → Secrets and variables → Actions):
- `MODEL_WEIGHTS_URL`: URL to a `.tar.gz` / `.zip` archive with `classification.onnx` and `segmentation.onnx`.
- `GROQ_API_KEY`, `SMTP_*`, `PROD_SSH_*`: as already configured.

ONNX paths (`CLS_ONNX_PATH`, `SEG_ONNX_PATH`) are written into the deploy `.env` automatically; they are config, not secrets.

### 3. ML Model Weights
Production deploys download ONNX weights onto the server at `/opt/curavision/models/` and mount them read-only into `ai-service` / `ai-worker` at `/models`. Set the GitHub Actions secret `MODEL_WEIGHTS_URL` to a `.tar.gz` or `.zip` archive containing `classification.onnx` and `segmentation.onnx`.

For manual/local download:
```bash
export MODEL_WEIGHTS_URL="https://your-storage-bucket.com/models/weights.tar.gz"
export MODEL_WEIGHTS_DIR="/opt/curavision/models"   # production
./scripts/download_weights.sh
```
Without `MODEL_WEIGHTS_DIR`, files land in `ai-service/app/ml_models/`.

### 4. Database Backups
Automated database backups can be scheduled using the backup script:
```bash
export POSTGRES_PASSWORD="your-secure-password"
./scripts/backup_db.sh
```
This generates a compressed SQL dump inside `backups/` and automatically purges backups older than 30 days. You can schedule this via a cron job on the host machine.

### 5. CD Deployment Pipeline
A deployment pipeline is defined in `.github/workflows/cd.yml`. It runs automatically when version tags matching `v*.*.*` are pushed to the repository. It builds minimal Docker images for all services and pushes them to GitHub Container Registry (GHCR).

## License

Maintained for educational and collaborative purposes.
