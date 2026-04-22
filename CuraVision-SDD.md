# CuraVision — Software Design Document (SDD)

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Date** | March 13, 2026 |
| **Author** | Abdelrahman Hisham |
| **Status** | Active |
| **Project Type** | DEPI Graduation Project — ML Engineer Track |
| **Related Document** | CuraVision-PRD.md v2.5 |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Module Decomposition](#3-module-decomposition)
4. [Data Design (PostgreSQL Schema)](#4-data-design-postgresql-schema)
5. [API Design](#5-api-design)
6. [AI Microservice API](#6-ai-microservice-api)
7. [Analysis Workflow](#7-analysis-workflow)
8. [UI/UX Integration](#8-uiux-integration)
9. [Security & Privacy Design](#9-security--privacy-design)
10. [Error Handling & Logging](#10-error-handling--logging)
11. [Performance & Scalability](#11-performance--scalability)
12. [Deployment & Environments](#12-deployment--environments)
13. [Appendix](#13-appendix)

---

## 1. Introduction

### 1.1 Purpose

This Software Design Document translates the CuraVision PRD (v2.5) into concrete technical decisions for implementation, covering:

- System decomposition into services and modules
- Data models and database schema (PostgreSQL)
- API contracts between components (Next.js ↔ Node.js ↔ FastAPI)
- AI pipeline integration (U-Net, Grad-CAM, LLM, RAG)
- Security, logging, and non-functional design aspects

### 1.2 Scope

CuraVision provides:

- Brain MRI DICOM upload and visualization
- Tumor segmentation (U-Net) and Grad-CAM heatmaps
- AI-assisted draft report generation (LLM)
- RAG-based patient chatbot
- Doctor, patient, and admin portals
- Reservation (appointment) system
- Audit logging for sensitive actions

This SDD focuses on the **MVP scope** corresponding to PRD P0/P1 features.

### 1.3 References

| Reference | Version / Detail |
|-----------|-----------------|
| CuraVision PRD | v2.5 |
| PostgreSQL | 15+ |
| Next.js | 14+ (App Router) |
| Node.js | 20+ (Express) |
| FastAPI | Python 3.10+ |
| ML Framework | PyTorch / TensorFlow |
| Vector DB | ChromaDB or Pinecone |
| Accessibility | WCAG 2.1 AA |

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Doctor Panel │  │ Patient Panel│  │ DICOM Viewer │  │ Chatbot UI    │    │
│  │              │  │              │  │ (Cornerstone)│  │               │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     │ REST / WebSocket
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                               │
│  Auth │ RBAC │ Reservations │ Audit Logging │ API Gateway │ DB Access       │
└─────────────────────────────────────┬──────────────────────────────────────┘
          │                            │
          │                            │ Async Job / HTTP
          ▼                            ▼
┌─────────────────────┐    ┌─────────────────────────────────────────────────┐
│  PostgreSQL         │    │  AI MICROSERVICE (Python + FastAPI)               │
│  Users, Scans,      │    │  U-Net │ Grad-CAM │ LLM │ RAG (ChromaDB)          │
│  Reports, Logs      │    └─────────────────────┬───────────────────────────┘
└─────────────────────┘                          │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │  Redis + Celery          │
                                    │  (Task Queue)            │
                                    └─────────────────────────┘
```

### 2.2 Service Responsibilities

| Service | Role |
|---------|------|
| **Next.js Frontend** | Renders role-specific dashboards; handles UI/UX; polls for async results; passes JWT in headers; no direct DB or AI access |
| **Node.js Backend** | Auth, RBAC, business logic, orchestrates AI calls, audit logging, persistence layer |
| **FastAPI AI Microservice** | U-Net inference, Grad-CAM, LLM report generation, RAG chatbot responses |
| **PostgreSQL** | Relational data store for all domain entities |
| **Redis + Celery** | Async task queue for heavy AI inference jobs |
| **Object Storage** | DICOM files, masks, heatmaps (local FS or S3-compatible e.g. MinIO) |
| **ChromaDB** | Vector DB for RAG knowledge base (medical glossaries) |

---

## 3. Module Decomposition

### 3.1 Frontend (Next.js)

```
frontend/
├── app/                          # App Router
│   ├── (auth)/login/             # Login page
│   ├── doctor/                   # Doctor dashboard, upload, viewer, report editor
│   ├── patient/                  # Patient dashboard, report view, chatbot
│   └── admin/                    # Admin dashboard, audit logs, user management
├── components/
│   ├── DICOMViewer.tsx           # Cornerstone.js wrapper
│   ├── ChatbotPanel.tsx
│   ├── ReportEditor.tsx
│   ├── BookingCalendar.tsx
│   └── ui/                       # Shared: Button, Card, Modal, Table, Form
├── lib/
│   ├── apiClient.ts              # HTTP client with JWT
│   └── auth.ts                   # Client-side role checks
└── hooks/
    ├── useScans.ts
    ├── useScanAnalysisStatus.ts
    ├── useReports.ts
    ├── useReservations.ts
    └── useChatbot.ts
```

### 3.2 Backend (Node.js + Express)

```
backend/
├── src/
│   ├── server.ts                 # App bootstrap
│   ├── config/                   # Env config, secrets, DB connection
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── scan.routes.ts
│   │   ├── report.routes.ts
│   │   ├── reservation.routes.ts
│   │   ├── chat.routes.ts        # Chatbot proxy
│   │   └── admin.routes.ts       # Audit logs, statistics
│   ├── controllers/              # Map HTTP to services
│   ├── services/
│   │   ├── AuthService.ts
│   │   ├── UserService.ts
│   │   ├── ScanService.ts        # DICOM upload, metadata
│   │   ├── AnalysisService.ts    # Orchestrates AI microservice + task queue
│   │   ├── ReportService.ts
│   │   ├── ReservationService.ts
│   │   ├── ChatService.ts        # LLM + RAG proxy
│   │   └── AuditService.ts
│   ├── models/                   # ORM models (Prisma / TypeORM / Sequelize)
│   ├── middleware/
│   │   ├── authenticateJWT.ts
│   │   ├── authorizeRole.ts
│   │   ├── auditLogger.ts
│   │   └── errorHandler.ts
│   └── integrations/
│       ├── fastapiClient.ts      # HTTP client to AI microservice
│       ├── redisClient.ts
│       └── storageClient.ts      # DICOM & image storage
└── prisma/
    └── schema.prisma             # Database schema (if using Prisma)
```

### 3.3 AI Microservice (FastAPI + Python)

```
ai-service/
├── app/
│   ├── main.py                   # FastAPI app, routers
│   ├── routes/
│   │   ├── segmentation.py
│   │   ├── explainability.py
│   │   ├── report.py
│   │   └── chatbot.py
│   ├── models/                   # Pydantic request/response schemas
│   ├── core/                     # Configuration, logging
│   ├── services/
│   │   ├── unet_service.py       # Load model, run inference
│   │   ├── gradcam_service.py
│   │   ├── llm_service.py        # Local LLM via Ollama
│   │   └── rag_service.py        # ChromaDB integration
│   ├── tasks/                    # Celery tasks for long-running jobs
│   └── storage/                  # Helpers: load DICOMs, save masks/heatmaps
├── models/                       # Trained model weights (.pt / .h5)
└── requirements.txt
```

---

## 4. Data Design (PostgreSQL Schema)

### 4.1 Entity-Relationship Overview

```
users ──┬── doctors ──┬── scans ──── scan_analysis
        │             │      └───── reports ──── report_corrections
        │             │                  └───── chat_sessions ── chat_messages
        │             └── doctor_availability
        │             └── reservations ◄──── patients
        └── patients
        └── audit_logs
```

### 4.2 Table Definitions

#### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default gen_random_uuid() |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `role` | ENUM('DOCTOR', 'PATIENT', 'ADMIN') | NOT NULL |
| `full_name` | VARCHAR(255) | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

#### `doctors`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, FK → users.id |
| `specialty` | VARCHAR(255) | |
| `license_number` | VARCHAR(100) | UNIQUE |

#### `patients`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, FK → users.id |
| `date_of_birth` | DATE | |
| `gender` | VARCHAR(20) | |
| `medical_record_number` | VARCHAR(100) | UNIQUE, nullable |

#### `scans`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `patient_id` | UUID | FK → patients.id, NOT NULL |
| `doctor_id` | UUID | FK → doctors.id, NOT NULL |
| `dicom_path` | TEXT | NOT NULL |
| `modality` | VARCHAR(50) | DEFAULT 'MRI' |
| `uploaded_at` | TIMESTAMPTZ | DEFAULT now() |
| `status` | ENUM | DEFAULT 'UPLOADED' |

**Status values:** `UPLOADED`, `ANALYSIS_PENDING`, `ANALYSIS_RUNNING`, `ANALYSIS_COMPLETE`, `FAILED`

#### `scan_analysis`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `scan_id` | UUID | FK → scans.id, UNIQUE |
| `unet_mask_path` | TEXT | |
| `gradcam_path` | TEXT | |
| `tumor_volume_cc` | NUMERIC(10,2) | |
| `tumor_location_description` | TEXT | |
| `inference_log` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

#### `reports`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `scan_id` | UUID | FK → scans.id, UNIQUE |
| `doctor_id` | UUID | FK → doctors.id |
| `ai_draft` | TEXT | |
| `final_report` | TEXT | Nullable until approved |
| `status` | ENUM | DEFAULT 'DRAFT' |
| `patient_visible` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

**Status values:** `DRAFT`, `REVIEWED`, `APPROVED`, `PUBLISHED`

#### `report_corrections` (HITL dataset)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `report_id` | UUID | FK → reports.id |
| `field` | VARCHAR(100) | e.g. 'tumor_size', 'impression' |
| `old_value` | TEXT | |
| `new_value` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

#### `reservations`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `doctor_id` | UUID | FK → doctors.id |
| `patient_id` | UUID | FK → patients.id |
| `start_time` | TIMESTAMPTZ | NOT NULL |
| `end_time` | TIMESTAMPTZ | NOT NULL |
| `status` | ENUM | DEFAULT 'PENDING' |

**Status values:** `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`

**Constraint:** `UNIQUE(doctor_id, start_time, end_time)` to prevent double-booking.

#### `doctor_availability`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `doctor_id` | UUID | FK → doctors.id |
| `day_of_week` | SMALLINT | 0–6 (Sun–Sat) |
| `start_time` | TIME | |
| `end_time` | TIME | |

#### `audit_logs`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `timestamp` | TIMESTAMPTZ | DEFAULT now() |
| `user_id` | UUID | FK → users.id |
| `action` | VARCHAR(100) | e.g. 'VIEW_SCAN', 'LOGIN' |
| `entity_type` | VARCHAR(50) | e.g. 'SCAN', 'REPORT' |
| `entity_id` | UUID | |
| `metadata` | JSONB | |

#### `chat_sessions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `patient_id` | UUID | FK → patients.id |
| `report_id` | UUID | FK → reports.id |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

#### `chat_messages`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `session_id` | UUID | FK → chat_sessions.id |
| `sender` | ENUM('PATIENT', 'BOT') | NOT NULL |
| `message` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

### 4.3 Key Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `scans` | `(patient_id)` | Lookup scans by patient |
| `scans` | `(doctor_id)` | Lookup scans by doctor |
| `reports` | `(scan_id)` | Lookup report by scan |
| `reservations` | `(doctor_id, start_time)` | Availability queries |
| `reservations` | `(patient_id)` | Patient appointment history |
| `audit_logs` | `(user_id, timestamp)` | Audit trail queries |
| `audit_logs` | `(entity_type, entity_id)` | Entity history |
| `chat_messages` | `(session_id, created_at)` | Ordered chat history |

---

## 5. API Design

### 5.1 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Returns JWT |

**POST `/api/auth/login`**

Request:

```json
{ "email": "doctor@example.com", "password": "..." }
```

Response:

```json
{
  "token": "eyJhbGci...",
  "user": { "id": "uuid", "role": "DOCTOR", "full_name": "Dr. Smith" }
}
```

JWT payload: `{ sub, role, exp }`

### 5.2 Scans

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/scans` | DOCTOR | Upload DICOM, triggers analysis |
| GET | `/api/scans/:id` | DOCTOR | Scan metadata + status |
| GET | `/api/scans/:id/analysis` | DOCTOR | Segmentation + Grad-CAM results |
| GET | `/api/patients/:patientId/scans` | DOCTOR | List scans for a patient |

**POST `/api/scans`**

Request: `multipart/form-data` — `file` (DICOM), `patient_id`

Response:

```json
{ "scan_id": "uuid", "status": "ANALYSIS_PENDING" }
```

**GET `/api/scans/:id/analysis`**

Response:

```json
{
  "scan_id": "uuid",
  "unet_mask_path": "/storage/masks/uuid.nii.gz",
  "gradcam_path": "/storage/heatmaps/uuid.png",
  "tumor_volume_cc": 12.3,
  "tumor_location_description": "Frontal lobe, left hemisphere"
}
```

### 5.3 Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/scans/:id/report` | DOCTOR | Get report (draft or final) |
| PATCH | `/api/reports/:id` | DOCTOR | Edit report; logs corrections |
| POST | `/api/reports/:id/approve` | DOCTOR | Approve & publish to patient |
| GET | `/api/patient/reports` | PATIENT | List published reports |
| GET | `/api/patient/reports/:id` | PATIENT | View single published report |

**PATCH `/api/reports/:id`**

Request:

```json
{
  "final_report": "Edited report text...",
  "corrections": [
    { "field": "impression", "old_value": "...", "new_value": "..." }
  ]
}
```

### 5.4 Reservations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/doctors/:doctorId/availability` | PATIENT | Available time slots |
| POST | `/api/reservations` | PATIENT | Book appointment |
| PATCH | `/api/reservations/:id` | DOCTOR, PATIENT | Cancel or confirm |
| GET | `/api/reservations` | DOCTOR, PATIENT | List own appointments |

**POST `/api/reservations`**

Request:

```json
{
  "doctor_id": "uuid",
  "start_time": "2026-04-01T09:00:00Z",
  "end_time": "2026-04-01T09:30:00Z"
}
```

### 5.5 Chatbot

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat/:reportId/message` | PATIENT | Send message, get reply |
| GET | `/api/chat/:reportId/history` | PATIENT | Chat history |

**POST `/api/chat/:reportId/message`**

Request:

```json
{ "session_id": "uuid-or-null", "message": "What does edema mean?" }
```

Response:

```json
{
  "session_id": "uuid",
  "reply": "Edema refers to swelling caused by...",
  "sources": ["Medical Glossary p.42"]
}
```

### 5.6 Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/audit-logs` | ADMIN | Query audit logs (filters, pagination) |
| GET | `/api/admin/users` | ADMIN | List/search users |
| PATCH | `/api/admin/users/:id` | ADMIN | Update user role/status |

---

## 6. AI Microservice API

### 6.1 Endpoints

All endpoints are internal — called only by the Node.js backend.

#### POST `/ai/segmentation`

Request:

```json
{
  "scan_id": "uuid",
  "dicom_path": "storage/dicoms/uuid/"
}
```

Response:

```json
{
  "scan_id": "uuid",
  "mask_path": "storage/masks/uuid.nii.gz",
  "tumor_volume_cc": 12.3,
  "tumor_location_description": "Frontal lobe, left hemisphere"
}
```

#### POST `/ai/gradcam`

Request:

```json
{
  "scan_id": "uuid",
  "dicom_path": "storage/dicoms/uuid/",
  "model_output_path": "storage/masks/uuid.nii.gz"
}
```

Response:

```json
{ "gradcam_path": "storage/heatmaps/uuid.png" }
```

#### POST `/ai/report`

Request:

```json
{
  "scan_id": "uuid",
  "tumor_volume_cc": 12.3,
  "tumor_location_description": "Frontal lobe, left hemisphere",
  "doctor_notes": "Patient presents with headaches and visual disturbances"
}
```

Response:

```json
{ "ai_draft": "FINDINGS:\nA 12.3 cc mass is identified in the left frontal lobe..." }
```

#### POST `/ai/chatbot`

Request:

```json
{
  "report_text": "FINDINGS: A 12.3 cc mass...",
  "patient_question": "What does edema mean?",
  "chat_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Response:

```json
{
  "answer": "Edema means swelling caused by excess fluid...",
  "sources": ["Medical Glossary: Edema"]
}
```

### 6.2 Safety Guardrails

- Chatbot refuses to diagnose new symptoms — enforced via system prompt and RAG retrieval boundaries.
- LLM report is always marked as `DRAFT` — requires doctor approval before patient visibility.
- All AI responses include model version and inference timestamp for traceability.

---

## 7. Analysis Workflow

### 7.1 End-to-End Sequence

```
Doctor                  Backend                AI Microservice         PostgreSQL
  │                        │                        │                      │
  │── POST /api/scans ────►│                        │                      │
  │                        │── store DICOM ─────────┼─────────────────────►│
  │                        │── INSERT scan ──────────┼─────────────────────►│
  │                        │── enqueue task ────────►│                      │
  │◄── { scan_id, PENDING }│                        │                      │
  │                        │                        │                      │
  │                        │                        │── U-Net inference     │
  │                        │                        │── save mask           │
  │                        │                        │── Grad-CAM            │
  │                        │                        │── save heatmap        │
  │                        │                        │── LLM report          │
  │                        │◄── callback / poll ────│                      │
  │                        │── UPDATE scan_analysis ─┼─────────────────────►│
  │                        │── UPDATE reports ───────┼─────────────────────►│
  │                        │── UPDATE scans.status ──┼─────────────────────►│
  │                        │                        │                      │
  │── GET /api/scans/:id ─►│                        │                      │
  │◄── { status: COMPLETE }│                        │                      │
  │                        │                        │                      │
  │── GET /report ────────►│                        │                      │
  │◄── { ai_draft: "..." } │                        │                      │
  │                        │                        │                      │
  │── POST /approve ──────►│                        │                      │
  │                        │── UPDATE report ────────┼─────────────────────►│
  │                        │── INSERT audit_log ─────┼─────────────────────►│
  │◄── { status: PUBLISHED}│                        │                      │
```

### 7.2 Task Queue Design

| Component | Technology | Detail |
|-----------|------------|--------|
| Broker | Redis | Message transport |
| Worker | Celery (Python) | Runs in AI microservice container |
| Task | `run_full_analysis` | Chains: segmentation → Grad-CAM → report |
| Status | Polling or callback | Backend polls task state or receives webhook |

---

## 8. UI/UX Integration

### 8.1 Design-to-Code Mapping

| Figma Deliverable | Frontend Implementation |
|-------------------|------------------------|
| Design system (tokens, components) | `components/ui/` — shared component library |
| Doctor dashboard wireframe | `app/doctor/page.tsx` |
| DICOM viewer mockup | `components/DICOMViewer.tsx` (Cornerstone.js) |
| Report editor mockup | `components/ReportEditor.tsx` |
| Patient dashboard wireframe | `app/patient/page.tsx` |
| Chatbot interface mockup | `components/ChatbotPanel.tsx` |
| Booking flow mockup | `components/BookingCalendar.tsx` |

### 8.2 State & Loading Patterns

| Pattern | Implementation |
|---------|---------------|
| AI analysis progress | Poll `GET /api/scans/:id` every 3s; show skeleton/progress bar |
| Chatbot streaming | POST → response; optionally WebSocket for streaming |
| Optimistic updates | Report edits saved locally, synced on PATCH |
| Error states | Inline validation; toast notifications for API errors |

### 8.3 Accessibility Implementation

| Requirement | Approach |
|-------------|----------|
| Semantic HTML | Use `<main>`, `<nav>`, `<section>`, `<article>`, `<button>` |
| ARIA labels | Label DICOM viewer controls, chatbot input, report actions |
| Keyboard navigation | Focus management on modals, tab order on forms |
| Color contrast | 4.5:1 minimum; tested with axe-core |
| Screen reader | Alt text for medical images; `aria-live` for chatbot replies |

---

## 9. Security & Privacy Design

### 9.1 Authentication Flow

```
Client                     Backend                   PostgreSQL
  │── POST /auth/login ───►│                            │
  │                        │── verify password ─────────►│
  │                        │◄── user record ────────────│
  │                        │── sign JWT (sub, role, exp) │
  │◄── { token, user } ───│                            │
  │                        │                            │
  │── GET /api/scans ─────►│                            │
  │   Authorization: Bearer│── verify JWT               │
  │                        │── check role               │
  │                        │── process request          │
```

### 9.2 Security Measures

| Area | Implementation |
|------|---------------|
| Password storage | bcrypt or argon2 hashing |
| JWT | Short-lived (15 min); optional refresh token |
| RBAC | Middleware checks `role` from JWT per route |
| HTTPS | Enforced in production |
| DICOM storage | Non-guessable UUID paths; access-controlled |
| PHI in logs | Sanitized — no patient names or raw data in `audit_logs.metadata` |
| Input validation | Express-validator on backend; Pydantic on AI service |

---

## 10. Error Handling & Logging

### 10.1 Error Response Format

All API errors return a consistent shape:

```json
{
  "code": "SCAN_NOT_FOUND",
  "message": "Scan with the given ID does not exist.",
  "details": {}
}
```

### 10.2 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created (new scan, reservation) |
| 400 | Validation error |
| 401 | Missing or invalid JWT |
| 403 | Insufficient role |
| 404 | Entity not found |
| 409 | Conflict (e.g. double-booking) |
| 500 | Internal server error |

### 10.3 Logging Strategy

| Service | Format | Content |
|---------|--------|---------|
| Backend | Structured JSON | Request ID, method, path, status, duration |
| AI Microservice | Structured JSON | Inference time, model version, scan_id |
| Frontend | Browser console + error boundary | Client-side errors sent to backend `/api/logs` (optional) |

---

## 11. Performance & Scalability

### 11.1 Optimization Targets

| Area | Target | Approach |
|------|--------|----------|
| Page load | < 3s | Next.js SSR/SSG; code splitting |
| API response (non-AI) | < 500ms | Indexed queries; connection pooling |
| AI pipeline | < 30s total | GPU inference; batched operations; Celery workers |
| DICOM rendering | Interactive | Cornerstone.js client-side rendering |

### 11.2 Scalability

| Component | Strategy |
|-----------|----------|
| Frontend | Stateless; CDN for static assets |
| Backend | Stateless; horizontal scaling behind load balancer |
| AI Workers | Scale Celery workers by queue length |
| PostgreSQL | Connection pooling (PgBouncer); read replicas if needed |

### 11.3 Database Indexes

Defined in [Section 4.3](#43-key-indexes). Additional composite indexes added based on query profiling during development.

---

## 12. Deployment & Environments

### 12.1 Development (Docker Compose)

```yaml
services:
  frontend:       # Next.js dev server
  backend:        # Node.js + Express
  ai-service:     # FastAPI + Celery worker
  postgres:       # PostgreSQL 15
  redis:          # Task queue broker
  chromadb:       # Vector DB for RAG
  minio:          # S3-compatible object storage (optional)
```

### 12.2 Environment Variables (Sample)

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | JWT signing secret |
| `REDIS_URL` | Backend, AI | Redis connection string |
| `AI_SERVICE_URL` | Backend | FastAPI base URL |
| `OLLAMA_BASE_URL` | AI | Local LLM endpoint |
| `CHROMADB_HOST` | AI | Vector DB host |
| `STORAGE_PATH` | Backend, AI | Object storage root |

### 12.3 Production (Simulated)

- Separate containers per component.
- GPU node for AI microservice if available.
- HTTPS via reverse proxy (Nginx / Traefik).
- Secrets managed via `.env` files (or vault for production).

---

## 13. Appendix

### A. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-13 | Initial SDD aligned with PRD v2.5 |

### B. Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| PostgreSQL over MongoDB | Strong consistency for reservations; FK integrity for audit; JSONB for flexible fields |
| Separate AI microservice | Isolate GPU workloads; independent scaling; Python ML ecosystem |
| Celery + Redis over RabbitMQ | Simpler setup; sufficient for project scale; Python-native |
| Local LLM (Ollama) | Privacy; no cloud cost; 6GB VRAM constraint |
| Prisma (proposed ORM) | Type-safe; migration support; PostgreSQL-first |

### C. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Dataset selection for U-Net training | TBD |
| 2 | Prisma vs TypeORM vs Sequelize | TBD |
| 3 | WebSocket vs polling for analysis status | TBD |
| 4 | DICOM storage: local FS vs MinIO | TBD |
