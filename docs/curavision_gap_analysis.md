# CuraVision — Gap Analysis

> **Generated**: 2026-04-30 · **Compared against**: PRD v2.3 + SDD v1.0

---

## Executive Summary

The CuraVision monorepo has solid **scaffolding** across all layers — the frontend, backend, ai-service, ML training code, Celery worker, Docker Compose, CI, and Prisma schema are all present and structurally sound. However, the project is still running on **stubs and mock data** for its core value proposition (the AI analysis pipeline). Below is a layer-by-layer breakdown of what's built vs. what's missing.

### Completion Heatmap

| Layer | Scaffolding | Core Logic | Integration | Production-Ready |
|-------|:-----------:|:----------:|:-----------:|:----------------:|
| **Frontend** | ✅ | 🟡 ~75% | 🟡 ~60% | 🔴 |
| **Backend** | ✅ | 🟡 ~80% | 🟡 ~60% | 🔴 |
| **AI Service** | ✅ | 🔴 ~30% | 🟡 ~50% | 🔴 |
| **ML Pipeline** | ✅ | 🟡 ~60% | 🔴 ~20% | 🔴 |
| **Infra / DevOps** | ✅ | ✅ | 🟡 ~70% | 🟡 |

---

## 1. ML Pipeline (`ml/`)

### ✅ What's Done
- U-Net segmentation model architecture ([model.py](file:///home/abdlrhman/Courses/DEPI/Microsoft%20Machine%20Learning%20Engineer/GP/ml/src/segmentation/model.py))
- Classification model with `timm` backbone ([model.py](file:///home/abdlrhman/Courses/DEPI/Microsoft%20Machine%20Learning%20Engineer/GP/ml/src/classification/model.py))
- Training/evaluation loops for both tasks
- Data augmentation pipelines
- ONNX export scripts
- ONNX inference predictors for both tasks
- Unified `BrainMRIPipeline` with classify-first → conditional-segment logic ([pipeline.py](file:///home/abdlrhman/Courses/DEPI/Microsoft%20Machine%20Learning%20Engineer/GP/ml/src/inference/pipeline.py))
- FastAPI wrapper for the ML pipeline ([api/main.py](file:///home/abdlrhman/Courses/DEPI/Microsoft%20Machine%20Learning%20Engineer/GP/ml/src/api/main.py))
- Config files for classification, segmentation, and inference
- Classification dataset present (5040 train images, 4 classes: glioma, meningioma, pituitary, no_tumor)
- One classification checkpoint saved (`efficientnet_b0_best.pth`)
- Grad-CAM heatmap generation (at least one sample heatmap exists)

### 🔴 What's Missing

| # | Gap | Severity | Details |
|---|-----|----------|---------|
| 1 | **No segmentation dataset** | **Critical** | `data/` only has classification data (JPGs). The U-Net needs pixel-level masks. PRD §3.1 requires "precise masks around brain tumors." No `.mat` or labeled mask data found despite having `convert_mat_segmentation.py`. |
| 2 | **No trained segmentation checkpoint** | **Critical** | `checkpoints/` only has `efficientnet_b0_best.pth` (classification). No segmentation `.pt` or `.onnx` file exists. |
| 3 | **No ONNX exports** | **High** | `artifacts/onnx/` doesn't exist. The inference pipeline expects `classification.onnx` and `segmentation.onnx` but neither is present. |
| 4 | **No evaluation metrics saved** | **High** | `artifacts/heatmaps/classification_metrics.json` and `segmentation_metrics.json` are missing. The PRD requires IoU/Dice > 0.85. |
| 5 | **Grad-CAM not integrated with inference pipeline** | **High** | The `BrainMRIPipeline` returns classification + segmentation results but does NOT generate a Grad-CAM heatmap. PRD §3.1 P0 requirement. |
| 6 | **ML requirements.txt is incomplete** | **Medium** | Missing `pyyaml`, `scipy`/`h5py` (for `.mat` files), `onnxruntime`, `fastapi`, `uvicorn`, `matplotlib`, `scikit-learn` — all needed by the existing code. |
| 7 | **No volume/size computation** | **Medium** | PRD says "compute dimensions and volume." The segmentation evaluator outputs pixel area ratio but not volume in cc. The inference pipeline only returns `tumor_area_pixels` and `tumor_area_ratio`, not physical volume. |

---

## 2. AI Service (`ai-service/`)

### ✅ What's Done
- FastAPI app with chatbot + analysis routes
- RAG service with ChromaDB integration + knowledge base (2 text files)
- LLM service (Groq + Ollama provider-agnostic)
- Evaluation service for response quality
- Celery worker + tasks (`segmentation → gradcam → report` chain)
- Callback mechanism to Node backend from worker
- Pydantic request/response models
- Safety guardrails in chatbot system prompt
- Tests (contract tests with stubs)
- `.env.example` with full variable list

### 🔴 What's Missing

| # | Gap | Severity | Details |
|---|-----|----------|---------|
| 1 | **Analysis endpoints are 100% stubs** | **Critical** | [analysis_service.py](file:///home/abdlrhman/Courses/DEPI/Microsoft%20Machine%20Learning%20Engineer/GP/ai-service/app/services/analysis_service.py) returns deterministic fake data (`sha1(scan_id) % N`). No real U-Net, Grad-CAM, or LLM report generation is wired in. |
| 2 | **No ML model integration** | **Critical** | The ai-service doesn't import or call anything from the `ml/` module. The trained models need to be loaded and invoked. |
| 3 | **LLM report generation is a string template** | **High** | `run_report()` returns a hardcoded template. Should call `llm_service.generate_response()` with tumor data as structured input. |
| 4 | **Knowledge base is minimal** | **Medium** | Only 2 text files (`brain_tumor.txt`, `mri_info.txt`). For robust RAG with "zero-hallucination" (PRD §3.1), this needs substantial medical glossary content. |
| 5 | **No DICOM file handling** | **Medium** | The service receives `dicom_path` strings but never actually reads/parses DICOM files. Needs `pydicom` or similar. |
| 6 | **No Grad-CAM implementation** | **High** | There's no actual Grad-CAM code in ai-service. The stub just returns a fake path. The `ml/` code has heatmap generation but it's not connected. |
| 7 | **Chatbot safety test suite missing** | **Medium** | PRD KPI: "100% refusal on new-symptom diagnosis." No dedicated safety tests exist. |

---

## 3. Backend (`backend/`)

### ✅ What's Done
- Express 5 server with full route structure (8 route files)
- JWT authentication + RBAC middleware
- Rate limiting (global + auth-specific)
- Audit logging middleware
- CORS allowlist configuration
- Prisma schema with all 11 models matching SDD §4
- Mock data for all entities (users, scans, reports, reservations, chat sessions, audit logs)
- Full service layer (Scan, Report, Reservation, Chat, Audit)
- FastAPI client integration
- Storage client (local filesystem)
- Tests: route tests + smoke test
- Seed script for Postgres

### 🔴 What's Missing

| # | Gap | Severity | Details |
|---|-----|----------|---------|
| 1 | **Internal callback route not implemented** | **High** | The Celery worker calls `POST /api/internal/scans/:id/analysis-complete` but this route doesn't exist in the backend. Comment in [tasks.py](file:///home/abdlrhman/Courses/DEPI/Microsoft%20Machine%20Learning%20Engineer/GP/ai-service/app/worker/tasks.py#L67): "The backend route is NOT implemented yet." |
| 2 | **Running entirely on mock data** | **High** | The backend hasn't been tested with real Postgres/Prisma. README confirms: "Until migrations are applied, the backend falls back to in-memory fixtures." |
| 3 | **No multipart DICOM upload handling** | **High** | `multer` is in `package.json` but there's only 1 controller (`chat.controller.js`). Scan upload likely routes directly in the route file but DICOM files may not actually persist to storage correctly. |
| 4 | **S3/MinIO integration not wired** | **Medium** | `storageClient.js` exists but uses local filesystem. Docker Compose has MinIO, and env vars reference `S3_*` but actual S3 client code is absent. |
| 5 | **No `redisClient.js`** | **Medium** | SDD §3.2 lists `integrations/redisClient.ts` but it doesn't exist. Backend can't interact with task queue status. |
| 6 | **No error handler middleware file** | **Low** | SDD §3.2 lists `middleware/errorHandler.ts` — error handling is inline in `server.js` instead. Works but doesn't match the design. |
| 7 | **No `PATCH /api/admin/users/:id`** | **Low** | SDD §5.6 defines admin user management. `admin.routes.js` exists but may not have the full endpoint set. |

---

## 4. Frontend (`frontend/`)

### ✅ What's Done
- Next.js 16 + React 19 + TypeScript 6 + Tailwind 4
- Auth pages (login, register)
- Route groups: `(auth)`, `(authenticated)`, `(public)`
- Doctor portal: dashboard, scans list, scan detail (`[id]`), upload, appointments
- Patient portal: dashboard, reports, chatbot, articles, scans, appointments, profile, settings
- Public pages: home, articles, chatbot, doctors list
- DICOM viewer component (Cornerstone.js with PNG/JPEG fallback)
- Auth context with `useAuth()` + `useRequireAuth(role)`
- API client with JWT Bearer header
- SweetAlert2 integration
- Sidebar + Navbar + Footer layout components
- ESLint + TypeScript configs
- Smoke test
- Dockerfile for production build

### 🔴 What's Missing

| # | Gap | Severity | Details |
|---|-----|----------|---------|
| 1 | **No admin portal** | **High** | PRD §3.4 requires admin dashboard with audit logs + user management. No `admin/` route group exists in `(authenticated)/`. |
| 2 | **Missing SDD components** | **High** | SDD §3.1 lists: `ReportEditor.tsx`, `ChatbotPanel.tsx`, `BookingCalendar.tsx`, `ui/` shared component library. Only `DicomViewer.tsx` exists under `components/medical/`. |
| 3 | **No custom hooks** | **Medium** | SDD §3.1 specifies: `useScans`, `useScanAnalysisStatus`, `useReports`, `useReservations`, `useChatbot`. No `hooks/` directory exists. |
| 4 | **No polling/progress UI for async analysis** | **Medium** | SDD §8.2 requires polling `GET /api/scans/:id` every 3s with skeleton/progress bar during AI analysis. Not implemented. |
| 5 | **No HITL corrections UI** | **Medium** | PRD P1: doctors can correct tumor boundary/report with corrections logged. The scan detail page likely doesn't have this panel. |
| 6 | **Doctor report review/approve workflow** | **Medium** | The scan `[id]` page exists but unclear if it implements full review → edit → approve → publish flow per SDD §7. |
| 7 | **No `types/` definitions** | **Low** | `src/types/` only has `cornerstone-shims.d.ts`. No shared type definitions for API responses (User, Scan, Report, etc.). |
| 8 | **No Redux/React Query** | **Low** | PRD §6.1 lists "Redux Toolkit / React Query" for state management. Not installed. Currently using local state + context. |

---

## 5. Infrastructure & DevOps

### ✅ What's Done
- Docker Compose with all 8 services (frontend, backend, ai-service, worker, postgres, redis, chromadb, minio)
- MinIO bootstrap container for bucket creation
- Health checks on all infrastructure services
- CI pipeline (`ci.yml`) with 4 parallel jobs
- Dockerfiles for frontend, backend, ai-service
- `.env.example` files for all services
- `.gitignore` properly configured

### 🔴 What's Missing

| # | Gap | Severity | Details |
|---|-----|----------|---------|
| 1 | **No Prisma migrations committed** | **High** | `prisma/` has only `schema.prisma` + `seed.js`. No `migrations/` directory. First-time users must run `migrate dev` manually. |
| 2 | **ML service not in Docker Compose** | **Medium** | The `ml/src/api/main.py` FastAPI server is completely separate from the Docker Compose stack. If ML inference should happen in-process with ai-service, the models need to be copied/mounted. |
| 3 | **No environment validation** | **Low** | No startup check that required env vars (JWT_SECRET, GROQ_API_KEY, etc.) are actually set. |
| 4 | **No HTTPS/TLS config** | **Low** | PRD §8 NFR: "HTTPS enforced in production." No TLS config, reverse proxy, or cert handling present. Expected for prod only. |

---

## 6. Documentation

### ✅ What's Done
- Detailed README.md with quick start, endpoints, and architecture
- PRD v2.3 (comprehensive)
- SDD v1.0 (comprehensive — schema, API contracts, sequence diagrams)

### 🟡 What Could Be Improved

| # | Gap | Severity |
|---|-----|----------|
| 1 | **No API docs / Swagger** | Low — FastAPI auto-generates `/docs` but backend has no OpenAPI spec |
| 2 | **No architecture diagram image** | Low — text-based diagrams exist but no visual diagram |
| 3 | **ML README outdated** | Low — `ml/README.md` may not reflect the current file structure |

---

## Prioritized Action Plan

### 🔴 Phase 1 — Critical (Unblock Core Value Proposition)

| Priority | Action | Layer |
|----------|--------|-------|
| **P0-1** | Acquire/create segmentation dataset with pixel masks | ML |
| **P0-2** | Train U-Net segmentation model & export to ONNX | ML |
| **P0-3** | Export classification model to ONNX | ML |
| **P0-4** | Wire real ML models into `ai-service/app/services/analysis_service.py` (replace stubs) | AI Service |
| **P0-5** | Implement real Grad-CAM heatmap generation in analysis pipeline | AI Service + ML |
| **P0-6** | Wire LLM-based report generation (replace string template) | AI Service |

### 🟠 Phase 2 — High (Complete the Integration Loop)

| Priority | Action | Layer |
|----------|--------|-------|
| **P1-1** | Implement `POST /api/internal/scans/:id/analysis-complete` callback route | Backend |
| **P1-2** | Run Prisma migrations against Postgres and test with real DB | Backend |
| **P1-3** | Build admin portal (audit logs + user management pages) | Frontend |
| **P1-4** | Create missing components: `ReportEditor`, `ChatbotPanel`, `BookingCalendar`, shared `ui/` | Frontend |
| **P1-5** | Add Grad-CAM to `BrainMRIPipeline` response | ML |
| **P1-6** | Fix ML `requirements.txt` (add pyyaml, onnxruntime, scipy, matplotlib, etc.) | ML |

### 🟡 Phase 3 — Medium (Polish & Robustness)

| Priority | Action | Layer |
|----------|--------|-------|
| **P2-1** | Add polling/progress UI for async scan analysis | Frontend |
| **P2-2** | Implement HITL corrections panel in doctor scan review | Frontend |
| **P2-3** | Add custom hooks (`useScans`, `useReports`, etc.) | Frontend |
| **P2-4** | Expand RAG knowledge base (medical glossaries, tumor types) | AI Service |
| **P2-5** | Implement DICOM file parsing in ai-service | AI Service |
| **P2-6** | Wire S3/MinIO storage in backend | Backend |
| **P2-7** | Add chatbot safety test suite | AI Service |
| **P2-8** | Implement physical volume (cc) calculation from segmentation mask | ML |
| **P2-9** | Add shared TypeScript types for API responses | Frontend |
| **P2-10** | Add `redisClient.js` for task queue status polling | Backend |

---

> [!IMPORTANT]
> The **#1 blocker** for the entire project is the absence of a segmentation dataset and trained segmentation model. Classification works (checkpoint exists), but the U-Net — which is the core differentiator described in the PRD — has no data to train on. Everything downstream (Grad-CAM overlay on segmentation, volume computation, LLM report from mask data) depends on this.
