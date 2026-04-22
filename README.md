# CuraVision

CuraVision is a multi-service project that combines a web app, an API layer, an AI chatbot service, and machine learning training code in a single monorepo.

## Monorepo Layout

```text
GP/
├── frontend/         # Next.js + TypeScript web app
├── backend/          # Node.js + Express API
├── ai-service/       # FastAPI RAG chatbot service (ChromaDB + Groq)
├── ml/               # ML training/inference code and datasets
├── scripts/          # Standalone scripts and prototypes
├── docs/             # Product and design documentation
├── .gitignore
└── README.md
```

## Services at a Glance

| Service       | Stack                     | Default Port |
|---------------|---------------------------|--------------|
| Frontend      | Next.js 14, TypeScript    | 3000         |
| Backend API   | Node.js, Express          | 5000         |
| AI Service    | FastAPI, ChromaDB, Groq   | 8000         |
| ML Scripts    | Python, PyTorch, timm     | n/a          |

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- `venv` or another Python environment manager
- Git

---

## Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev
```

Additional commands:

```bash
npm run build
npm run lint
npm start
```

## Backend (`backend/`)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Production-style run:

```bash
npm start
```

## AI Service (`ai-service/`)

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## ML Scripts (`ml/`)

```bash
cd ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Example usage:

```bash
python src/run_train.py
python src/run_test.py
```

Notes:

- `ml/data/` and `ml/checkpoints/` are intentionally untracked (see `.gitignore`).
- Place the dataset under `ml/data/` before training.

## Scripts (`scripts/`)

Standalone utilities and prototypes, for example `scripts/chatbot.py` (early chatbot script; production chatbot lives in `ai-service/`).

## Documentation (`docs/`)

- [`docs/CuraVision-PRD.md`](docs/CuraVision-PRD.md) — Product Requirements Document
- [`docs/CuraVision-SDD.md`](docs/CuraVision-SDD.md) — Software Design Document

---

## Environment and Secrets

- Do not commit `.env` files; use `.env.example` as the template.
- Services read configuration from their own `.env` files:
  - `backend/.env`
  - `ai-service/.env`

## Repository Status

- Main branches integrated into `main`.
- Repository cleaned and reorganized into a service-oriented layout.
- Large artifacts (datasets, checkpoints, vector DB) are kept out of Git.

## License

Maintained for educational and collaborative purposes.
