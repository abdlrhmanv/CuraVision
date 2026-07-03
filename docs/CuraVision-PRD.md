# CuraVision — Product Requirement Document (PRD)

| Field | Value |
|-------|-------|
| **Document Version** | 2.5 |
| **Date** | July 3, 2026 |
| **Author** | Abdelrahman Hisham |
| **Status** | Active |
| **Project Type** | DEPI Graduation Project — ML Engineer Track |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Glossary](#2-glossary)
3. [Core Features & Requirements](#3-core-features--requirements)
4. [System Architecture](#4-system-architecture)
5. [User Flows](#5-user-flows)
6. [Tech Stack](#6-tech-stack)
7. [Success Metrics (KPIs)](#7-success-metrics-kpis)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Risks & Mitigation](#9-risks--mitigation)
10. [Next Steps & Roadmap](#10-next-steps--roadmap)
11. [Appendix](#11-appendix)

---

## 1. Executive Summary

### 1.1 Project Overview

CuraVision is an advanced, AI-powered medical web platform designed to analyze Brain MRI scans. The system combines:

- **U-Net** for precise tumor segmentation (size/volume)
- **Grad-CAM** for explainable, clinically interpretable predictions
- **LLM** for automated draft report generation from visual + textual context
- **RAG-powered chatbot** for safe, grounded patient communication
- **Integrated portals** and an automated reservation system

### 1.2 Problem Statement

| Stakeholder | Pain Point |
|-------------|------------|
| **Doctors** | Need transparent, explainable "second opinions" — not black-box predictions. Manual report writing is time-consuming. |
| **Patients** | Struggle with medical jargon, lack clarity on next steps, and face friction when booking follow-ups. |
| **Healthcare Systems** | Must balance innovation with strict privacy, accuracy, and regulatory compliance. |

### 1.3 Project Objectives

| # | Objective | Description |
|---|-----------|-------------|
| 1 | **Precision AI** | U-Net model for tumor segmentation with exact size/volume calculation (beyond classification) |
| 2 | **Clinical Trust (XAI)** | Grad-CAM heatmaps to visualize which MRI regions influenced predictions |
| 3 | **Automated Reporting** | LLM drafts structured reports from mask data + clinical notes |
| 4 | **Safe Patient Communication** | RAG pipeline for zero-hallucination chatbot grounded in verified literature |
| 5 | **Robust Architecture** | Async, microservices-based system with DICOM support and audit logging |

### 1.4 Target Audience

| Role | Primary Needs |
|------|---------------|
| **Neurologists & Radiologists** | Explainable AI, DICOM viewer, automated report generation |
| **Patients** | Understandable results, secure access, integrated booking |
| **System Administrators** | Credential management, system health, audit logs |

### 1.5 Value Proposition

> CuraVision bridges the gap between complex diagnostic imaging and patient comprehension. By combining Computer Vision with Generative AI, it reduces the administrative burden on doctors while empowering patients to understand their health and take immediate action through integrated appointment booking.

---

## 2. Glossary

| Term | Definition |
|------|------------|
| **DICOM** | Digital Imaging and Communications in Medicine — standard for medical imaging storage and transmission |
| **Grad-CAM** | Gradient-weighted Class Activation Mapping — XAI technique that highlights important regions in an image |
| **RAG** | Retrieval-Augmented Generation — LLM approach that grounds responses in retrieved documents |
| **U-Net** | Convolutional network architecture for biomedical image segmentation |
| **HITL** | Human-in-the-Loop — workflow where humans review/correct AI outputs |
| **RBAC** | Role-Based Access Control — authorization model based on user roles |
| **IoU** | Intersection over Union — metric for segmentation quality |
| **Dice Coefficient** | Overlap metric for segmentation evaluation |

---

## 3. Core Features & Requirements

### 3.1 AI Pipeline (Core Engine)

| Feature | Requirement | Priority |
|---------|-------------|----------|
| **U-Net Segmentation** | Draw precise masks around brain tumors; compute dimensions and volume | P0 |
| **Grad-CAM** | Generate heatmaps overlaid on MRI highlighting diagnostic regions | P0 |
| **Multi-Modal Context** | Extract mask data (size, location) + doctor notes → rich prompt | P0 |
| **LLM Report Generation** | Draft formal medical report from multi-modal prompt | P0 |
| **RAG Chatbot** | Vector DB (ChromaDB) with medical glossaries; refuse independent diagnosis | P0 |

### 3.2 Doctor Panel & Workflow

| Feature | Requirement | Priority |
|---------|-------------|----------|
| **DICOM Viewer** | In-browser viewer (Cornerstone.js): pan, zoom, windowing on native DICOM | P0 |
| **Async AI Analysis** | Background task queue; UI shows progress, notifies when ready | P0 |
| **HITL Feedback** | Doctors can correct tumor boundary or report; corrections logged for fine-tuning | P1 |
| **Report Management** | Finalize, "Approve & Publish" to patient, view history | P0 |

### 3.3 Patient Panel & Chatbot

| Feature | Requirement | Priority |
|---------|-------------|----------|
| **Results Dashboard** | Read-only report + Grad-CAM/segmentation (if doctor-approved) | P0 |
| **Smart Chatbot** | Context-aware, initialized with patient report | P0 |
| **Booking Intent** | Detect follow-up intent → trigger booking UI | P1 |

### 3.4 Security, Compliance & Administration

| Feature | Requirement | Priority |
|---------|-------------|----------|
| **Audit Logging** | Log all sensitive actions (e.g., `doctor_id viewed patient_id scan at timestamp`) | P0 |
| **Auth & RBAC** | JWT-based login; route to role-specific dashboards | P0 |
| **Reservation System** | CRUD for doctor availability and patient bookings | P0 |

### 3.5 User Stories (Sample)

- **As a** radiologist, **I want** to upload a DICOM scan and receive a draft report within 30 seconds **so that** I can focus on clinical decisions.
- **As a** patient, **I want** to ask the chatbot "What does edema mean?" **so that** I understand my report without searching the web.
- **As an** admin, **I want** to view audit logs **so that** I can ensure compliance and investigate incidents.

---

## 4. System Architecture

### 4.1 High-Level Architecture

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

### 4.2 Data Flow (AI Pipeline)

1. **Upload** → DICOM stored; job enqueued
2. **Segmentation** → U-Net produces mask; volume/size computed
3. **Grad-CAM** → Heatmap generated
4. **Report** → Mask + notes → LLM → draft report
5. **Publish** → Doctor approves → patient sees report + chatbot context

---

## 5. User Flows

### 5.1 Doctor Flow

```
Login → Upload DICOM → [Background: Segmentation + Grad-CAM + Report] 
     → Review draft → Edit if needed → Approve & Publish → (Optional) View patient history
```

### 5.2 Patient Flow

```
Login → View approved report → (Optional) View visuals 
     → Ask chatbot questions → (Optional) Book follow-up
```

---

## 6. Tech Stack

### 6.1 Frontend

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (React 19) |
| Styling | Tailwind CSS 4 |
| Medical Imaging | Cornerstone.js |
| State | Context API & Local State |

### 6.2 Backend

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Storage | Local Filesystem / MinIO (S3-compatible) |

### 6.3 AI Microservice

| Layer | Technology |
|-------|------------|
| Framework | Python 3.11+ + FastAPI 0.136 |
| ML | PyTorch & ONNX (U-Net, Grad-CAM) |
| Task Queue | Redis + Celery |
| Vector DB | ChromaDB |
| LLM | Groq API (default) / local Ollama fallback |

---

## 7. Success Metrics (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Segmentation Accuracy** | IoU or Dice > 0.85 | Validation set |
| **System Latency** | < 30 seconds | Scan upload → draft report ready |
| **RAG Safety** | 100% refusal on new-symptom diagnosis | Safety test suite |
| **Workflow Efficiency** | ≥ 40% reduction in documentation time | Doctor time study |

---

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Page load < 3s; API response < 500ms (non-AI endpoints) |
| **Availability** | 99% uptime (development phase) |
| **Security** | HTTPS, JWT expiry, hashed passwords, audit trail |
| **Scalability** | Stateless backend; horizontal scaling of AI workers |
| **Privacy** | No PHI in logs; local LLM option for sensitive data |

---

## 9. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM hallucination in reports | Medium | High | Strict prompting; doctor review required; HITL |
| RAG chatbot gives medical advice | Medium | High | Refusal prompts; safety tests; verified corpus only |
| Dataset scarcity for U-Net | Medium | Medium | Dataset TBD; evaluate public options; transfer learning; augmentation |
| 6GB VRAM insufficient for LLM | Medium | Low | Quantization; smaller model; cloud fallback |

---

## 10. Next Steps & Roadmap

### Phase 1 — Foundation
1. **Database ERD** — Users, Scans, Reports, Audit Logs, Reservations
2. **API Contracts** — JSON payloads between Node.js and Python microservice
3. **Project Scaffolding** — Monorepo structure

### Phase 2 — AI Pipeline
4. **Dataset selection & acquisition** — TBD; labeled brain MRI dataset with segmentation masks required for U-Net training
5. **U-Net Training** — Segmentation model
6. **Grad-CAM** — Integration with model
7. **LLM + RAG** — Report generation and chatbot

### Phase 3 — Integration
8. **Backend + Frontend** — Full workflow
9. **DICOM Viewer** — Cornerstone.js integration
10. **Testing & Validation** — KPI verification

---

## 11. Appendix

### A. Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1 | 2026-03-13 | Improved structure, added glossary, architecture, NFRs |
| 2.2 | 2026-03-13 | PostgreSQL (replacing MongoDB); Next.js as sole frontend framework |
| 2.3 | 2026-03-13 | Dataset marked as TBD; no selection made yet |
| 2.5 | 2026-07-03 | Aligned stack details (Next.js 16, React 19, Tailwind 4, Prisma 7, MinIO); documented premium Doctor Appointments SaaS dashboard and clinical review queue. |

### B. References

- **Dataset:** Not yet selected. Candidates include BraTS, TCIA, and similar brain MRI datasets with segmentation labels.
- [Cornerstone.js](https://cornerstonejs.org/) — DICOM viewer
- [Grad-CAM Paper](https://arxiv.org/abs/1610.02391) — Explainable AI

### C. Out of Scope (v2.1)

- Multi-institution deployment
- Real-time video/streaming analysis
- Mobile native apps
- Billing/payment integration
