# CuraVision Roadmap — GitHub Issues Backlog

This backlog lists the roadmap items converted into structured GitHub Issues. Completed issues from our active development sprints are marked as **[RESOLVED]**.

---

## Milestone 1: Security Hardening & Critical Fixes

### Issue #1: Rotate exposed secrets in repository [RESOLVED]
- **Title**: `security: Rotate committed GROQ_API_KEY and JWT_SECRET`
- **Priority**: `P0`
- **Labels**: `security`, `backend`
- **Estimated Time**: `1h`
- **Dependencies**: `None`
- **Description**: 
  The development `.env` file containing the live keys was committed directly to the git repository. These keys must be rotated immediately to prevent unauthorized access and financial charges.
- **Acceptance Criteria**:
  - [x] GROQ API keys rotated in the Groq console.
  - [x] JWT secrets rotated in the development environment.
  - [x] Active backend uses new credentials.

---

### Issue #2: Git-ignore .env and scrub repository history [RESOLVED]
- **Title**: `security: Add .env to gitignore and scrub historical commits`
- **Priority**: `P0`
- **Labels**: `security`, `devops`
- **Estimated Time**: `2h`
- **Dependencies**: `Issue #1`
- **Description**: 
  Ensure that local configuration secrets are not tracked by git, and remove historically committed credentials from the git log.
- **Acceptance Criteria**:
  - [x] Root `.env` file added to `.gitignore`.
  - [x] Repository history scrubbed of old credentials using `git-filter-repo` or BFG repo-cleaner.
  - [x] `.env.example` placeholder template added to repository.

---

### Issue #3: Align cookie maxAge with JWT expiration [RESOLVED]
- **Title**: `bug: Algin authentication cookie maxAge with JWT lifetime`
- **Priority**: `P0`
- **Labels**: `bug`, `backend`, `auth`
- **Estimated Time**: `30m`
- **Dependencies**: `None`
- **Description**: 
  The cookie lifetime (`15m`) was shorter than the JWT expiration (`8h`), causing active user sessions to expire prematurely.
- **Acceptance Criteria**:
  - [x] Cookie `maxAge` matching token expiry configured in auth endpoints.
  - [x] Upgraded to a dual-token JWT flow (15m access cookie, 7d refresh cookie).

---

### Issue #4: Remove fallback query string token extraction [RESOLVED]
- **Title**: `security: Remove token parsing fallback from URL query parameters`
- **Priority**: `P0`
- **Labels**: `security`, `backend`, `auth`
- **Estimated Time**: `30m`
- **Dependencies**: `None`
- **Description**: 
  The `authenticateJWT` middleware extracts token fallbacks from `req.query.token`, leaking tokens to reverse proxy logs, browser history, and HTTP `Referer` headers.
- **Acceptance Criteria**:
  - [x] Query string parameter token parsing code removed from `authenticateJWT.js`.
  - [x] Tokens are accepted only via Authorization headers or HttpOnly cookies.

---

### Issue #5: Implement CSRF protection for state-changing operations [RESOLVED]
- **Title**: `security: Add CSRF protection middleware for mutate requests`
- **Priority**: `P1`
- **Labels**: `security`, `backend`
- **Estimated Time**: `4h`
- **Dependencies**: `None`
- **Description**: 
  HttpOnly authentication cookies are susceptible to Cross-Site Request Forgery (CSRF). Introduce a double-submit cookie pattern or CSRF token checks on state-changing requests (POST, PUT, DELETE, PATCH).
- **Acceptance Criteria**:
  - [x] CSRF token generation and validation middleware mounted in the Express backend.
  - [x] Client requests extract token from headers/meta tags and attach to mutate payloads.
  - [x] Non-mutating requests (GET) bypass validation.

---

## Milestone 2: Patient Dashboard & UX Fixes

### Issue #6: Wire patient dashboard to live statistics [RESOLVED]
- **Title**: `feat: Integrate patient dashboard metrics to backend stats API`
- **Priority**: `P0`
- **Labels**: `frontend`, `ux`
- **Estimated Time**: `4h`
- **Dependencies**: `Issue #9`
- **Description**: 
  The patient dashboard statistics cards currently contain hardcoded mock data. Wire them to fetch real values from the database.
- **Acceptance Criteria**:
  - [x] Patient landing page fetches metrics from `/api/patient/stats`.
  - [x] UI cards dynamically render scan, report, and appointment metrics.
  - [x] Proper loading states displayed during fetch.

---

### Issue #7: Dynamic patient portal greeting [RESOLVED]
- **Title**: `bug: Replace hardcoded Patient greeting name with auth name`
- **Priority**: `P0`
- **Labels**: `bug`, `frontend`, `ux`
- **Estimated Time**: `30m`
- **Dependencies**: `None`
- **Description**: 
  The dashboard greeting string welcomes the user with "Omar" regardless of the logged-in patient. Reference the authenticated context name.
- **Acceptance Criteria**:
  - [x] Hardcoded greeting string removed from `patient/page.tsx`.
  - [x] Greeting renders `{user.full_name}` retrieved from the authentication context.

---

### Issue #8: Refactor ChatbotPanel to design system variables [RESOLVED]
- **Title**: `ux: Align chatbot panel classes with dark-mode theme variables`
- **Priority**: `P1`
- **Labels**: `frontend`, `ux`
- **Estimated Time**: `1h`
- **Dependencies**: `None`
- **Description**: 
  The chatbot container uses hardcoded color classes (`bg-blue-600`, `bg-gray-100`) instead of CSS variables defined in `index.css`.
- **Acceptance Criteria**:
  - [x] Hardcoded Tailwind values replaced with design token utility styles.
  - [x] Panel matches dark-mode aesthetics.

---

### Issue #9: Add database metrics API endpoint for patients [RESOLVED]
- **Title**: `feat: Create GET /api/patient/stats backend query`
- **Priority**: `P1`
- **Labels**: `backend`
- **Estimated Time**: `3h`
- **Dependencies**: `None`
- **Description**: 
  Build a backend route that queries the database to return metrics (scans count, reports count, upcoming appointments) for the logged-in patient.
- **Acceptance Criteria**:
  - [x] `GET /api/patient/stats` route created in `patients.routes.js`.
  - [x] Computes real counts from PostgreSQL using Prisma.

---

## Milestone 3: ML Model Training

### Issue #10: Acquire and preprocess Brain MRI datasets [RESOLVED]
- **Title**: `ml: Build pipeline to fetch and preprocess BraTS/Figshare data`
- **Priority**: `P0`
- **Labels**: `ml`, `data`
- **Estimated Time**: `8h`
- **Dependencies**: `None`
- **Description**: 
  Establish scripts to acquire open-source brain tumor MRI datasets (BraTS / Figshare), format the slices, normalize the intensity, and partition into train/validation splits.
- **Acceptance Criteria**:
  - [x] Python script downloads data automatically.
  - [x] Preprocessing yields normalized tensors (`256x256` dimensions).
  - [x] Train/validation splits exported with reproducible seed.

---

### Issue #11: Train tumor classification model [RESOLVED]
- **Title**: `ml: Train convolutional classifier for brain tumor classes`
- **Priority**: `P0`
- **Labels**: `ml`, `training`
- **Estimated Time**: `16h`
- **Dependencies**: `Issue #10`
- **Description**: 
  Develop and train a ResNet/EfficientNet classifier (via `timm`) to categorize scans into 4 target classes: glioma, meningioma, pituitary, and no_tumor.
- **Acceptance Criteria**:
  - [x] Accuracy metric > 90% on validation split.
  - [x] Training logs and artifact metadata tracked in MLflow.
  - [x] Best model checkpoint saved.

---

### Issue #12: Train tumor segmentation model (U-Net) [RESOLVED]
- **Title**: `ml: Train U-Net model for brain tumor lesion segmentation`
- **Priority**: `P0`
- **Labels**: `ml`, `training`
- **Estimated Time**: `16h`
- **Dependencies**: `Issue #10`
- **Description**: 
  Build and train a 2D U-Net segmentation network to predict binary lesion masks from axial MRI slices.
- **Acceptance Criteria**:
  - [x] Validation Mean Dice Coefficient (IoU) > 0.85.
  - [x] Training history and loss metrics exported.

---

### Issue #13: Export classification & segmentation models to ONNX [RESOLVED]
- **Title**: `ml: Export checkpoints to ONNX runtime format`
- **Priority**: `P0`
- **Labels**: `ml`, `deployment`
- **Estimated Time**: `4h`
- **Dependencies**: `Issue #11`, `Issue #12`
- **Description**: 
  Convert PyTorch checkpoints to ONNX binaries with static graph dimensions for performant inference in CPU/GPU target environments.
- **Acceptance Criteria**:
  - [ ] Generated `classifier.onnx` and `segmentation.onnx` assets.
  - [ ] Model graphs verified with netron/onnx runtime checkers.

---

### Issue #14: Integrate ONNX pipeline into FastAPI service [RESOLVED]
- **Title**: `ai: Implement ONNX inference pipeline strategy in FastAPI`
- **Priority**: `P0`
- **Labels**: `ai`, `backend`
- **Estimated Time**: `4h`
- **Dependencies**: `Issue #13`
- **Description**: 
  Replace the placeholder threshold-based segmentation logic inside `ai-service` with `OnnxPipelineStrategy` using ONNX Runtime.
- **Acceptance Criteria**:
  - [ ] FastAPI loads ONNX runtimes successfully.
  - [ ] Predictions match PyTorch output metrics.
  - [ ] Fail-safe error handling when weights fail to load.

---

### Issue #15: Validate AI pipeline performance KPIs [RESOLVED]
- **Title**: `ai: Validate inference execution latency and Dice metrics`
- **Priority**: `P0`
- **Labels**: `ai`, `testing`
- **Estimated Time**: `8h`
- **Dependencies**: `Issue #14`
- **Description**: 
  Run validation tests over the integrated AI pipeline to measure latency and verify performance targets.
- **Acceptance Criteria**:
  - [x] Inference execution latency remains < 30 seconds.
  - [x] Core evaluation tests assert Dice coefficient > 0.85.

---

## Milestone 4: Testing & Quality

### Issue #16: Implement backend service unit tests [RESOLVED]
- **Title**: `test: Write backend unit tests for services`
- **Priority**: `P1`
- **Labels**: `testing`, `backend`
- **Estimated Time**: `12h`
- **Dependencies**: `None`
- **Description**: 
  Establish unit tests using the Node.js native test runner to cover user registration, login rules, password resets, and reports creation.
- **Acceptance Criteria**:
  - [x] Service tests coverage written in `tests/services.test.js`.
  - [x] Tests run state-lessly using localized testing databases.
  - [x] High assertion coverage over database write routines.

---

### Issue #17: Implement frontend component unit tests
- **Title**: `test: Write unit and visual tests for core React components`
- **Priority**: `P1`
- **Labels**: `testing`, `frontend`
- **Estimated Time**: `8h`
- **Dependencies**: `None`
- **Description**: 
  Write unit tests with Jest/React Testing Library for core UI layouts (Card, Button, Sidebar) and interactive calendar booking helpers.
- **Acceptance Criteria**:
  - [ ] Test scripts pass typechecking.
  - [ ] Core visual renders and button triggers are assertion-validated.

---

### Issue #18: Write Playwright E2E integration tests [RESOLVED]
- **Title**: `test: Add Playwright end-to-end user workflows`
- **Priority**: `P1`
- **Labels**: `testing`, `frontend`
- **Estimated Time**: `16h`
- **Dependencies**: `None`
- **Description**: 
  Implement E2E test suites with Playwright checking doctor uploads, reports creation, report reviews, and patient chatbot conversation flow.
- **Acceptance Criteria**:
  - [x] E2E flows written in `frontend/tests/e2e/scan-workflow.spec.ts`.
  - [x] Auth validation checks added in `frontend/tests/e2e/auth.spec.ts`.

---

### Issue #19: Implement API load testing
- **Title**: `test: Set up API load and stress testing`
- **Priority**: `P2`
- **Labels**: `testing`, `devops`
- **Estimated Time**: `4h`
- **Dependencies**: `None`
- **Description**: 
  Write load test scripts using `k6` or `Artillery` to simulate concurrent API traffic and verify rate limit boundaries.
- **Acceptance Criteria**:
  - [ ] Test scenarios simulate 50+ concurrent requests.
  - [ ] Performance metrics (p95 latency) logged.
  - [ ] Server handles traffic spikes gracefully without crash logs.

---

## Milestone 5: Production Polish

### Issue #20: Implement email verification flow
- **Title**: `feat: Implement user register email verification`
- **Priority**: `P1`
- **Labels**: `frontend`, `backend`
- **Estimated Time**: `8h`
- **Dependencies**: `Issue #21`
- **Description**: 
  Add email verification token logic during registration to validate user emails before accounts are activated.
- **Acceptance Criteria**:
  - [ ] User record contains `email_verified` boolean (defaults to false).
  - [ ] Signed token sent via verification email.
  - [ ] `GET /api/auth/verify-email` endpoint updates status to active.

---

### Issue #21: Configurable production SMTP transport [RESOLVED]
- **Title**: `feat: Integrate customizable SMTP transporter fallback`
- **Priority**: `P1`
- **Labels**: `backend`
- **Estimated Time**: `2h`
- **Dependencies**: `None`
- **Description**: 
  Nodemailer relies on an ephemeral Ethereal developer account. Refactor it to read customizable SMTP settings from environment variables in production.
- **Acceptance Criteria**:
  - [x] Mail transport uses `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` when defined.
  - [x] Ethereal acts as a fallback in local development.

---

### Issue #22: Password reset recovery flow [RESOLVED]
- **Title**: `feat: Build password recovery flow with signed tokens`
- **Priority**: `P1`
- **Labels**: `frontend`, `backend`
- **Estimated Time**: `6h`
- **Dependencies**: `Issue #21`
- **Description**: 
  Allow users to reset lost passwords state-lessly using temporary email tokens.
- **Acceptance Criteria**:
  - [x] Endpoint `POST /api/auth/forgot-password` generates 1-hour valid token.
  - [x] Endpoint `POST /api/auth/reset-password` hashes and updates database passwords.

---

### Issue #23: Add gzip/brotli payload compression middleware [RESOLVED]
- **Title**: `perf: Mount compression middleware in Express`
- **Priority**: `P1`
- **Labels**: `performance`, `backend`
- **Estimated Time**: `1h`
- **Dependencies**: `None`
- **Description**: 
  Compress payload responses (JSON and text templates) to optimize bandwidth usage and page load times.
- **Acceptance Criteria**:
  - [x] `compression` package registered in Express backend dependencies.
  - [x] Compression middleware mounted globally in `server.js`.

---

### Issue #24: Add LLM response caching via Redis
- **Title**: `perf: Implement Redis caching for AI chatbot responses`
- **Priority**: `P1`
- **Labels**: `performance`, `ai`
- **Estimated Time**: `4h`
- **Dependencies**: `None`
- **Description**: 
  Chatbot queries often repeat standard glossary questions. Cache LLM response text in Redis to eliminate LLM processing latency and reduce API costs.
- **Acceptance Criteria**:
  - [ ] Hash of query strings acts as Redis cache key.
  - [ ] Subsequent matched queries return cached string instantly.
  - [ ] Cache expires after 24 hours.

---

### Issue #25: Doctor availability CRUD management [RESOLVED]
- **Title**: `feat: Build Doctor availability rules management page and API`
- **Priority**: `P1`
- **Labels**: `frontend`, `backend`
- **Estimated Time**: `8h`
- **Dependencies**: `None`
- **Description**: 
  Allow doctors to add and delete slot rules (days of week, working hours) via their portal settings.
- **Acceptance Criteria**:
  - [x] Backend CRUD endpoints created in `doctors.routes.js`.
  - [x] Dynamic rules list and form builder added at `/doctor/availability`.
  - [x] Sidebar navigation contains Availability link.

---

### Issue #26: Accessibility (a11y) audit and fixes
- **Title**: `a11y: Audit frontend accessibility and fix tags/keyboard support`
- **Priority**: `P1`
- **Labels**: `frontend`, `accessibility`
- **Estimated Time**: `8h`
- **Dependencies**: `None`
- **Description**: 
  Audit the React portal pages for accessibility barriers. Add missing aria attributes, semantic headings, focus states, and keyboard navigation triggers.
- **Acceptance Criteria**:
  - [ ] Buttons and interactive elements possess unique labels.
  - [ ] Modals and sidebar focus traps work via keyboard.
  - [ ] Lighthouse accessibility score exceeds 95.
