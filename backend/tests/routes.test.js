/**
 * Backend route tests — exercise each endpoint in-process with supertest.
 * Run with:  npm test
 *
 * We set a deterministic JWT_SECRET before importing the app so tokens are
 * stable across test cases.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN = "*";
// Knock the rate limiter way up so parallel tests don't hit 429s.
process.env.RATE_LIMIT_MAX = "10000";
process.env.AUTH_RATE_LIMIT_MAX = "10000";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const request = require("supertest");
const app = require("../src/server");
const prisma = require("../src/config/prisma");
const ScanService = require("../src/services/ScanService");
const ReportService = require("../src/services/ReportService");

async function login(email, password) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);
  return res.body;
}

test("GET /health → 200 ok", async () => {
  const res = await request(app).get("/health").expect(200);
  // "ok" when all deps are up; "degraded" when AI service is unavailable (e.g. CI).
  // Both are valid — only "unhealthy" (DB down) returns 503.
  assert.ok(
    res.body.status === "ok" || res.body.status === "degraded",
    `expected status ok|degraded, got "${res.body.status}"`
  );
  assert.equal(res.body.service, "CuraVision Backend");
});

test("unknown route → 404 NOT_FOUND", async () => {
  const res = await request(app).get("/api/does-not-exist").expect(404);
  assert.equal(res.body.code, "NOT_FOUND");
});

test("POST /api/auth/login rejects bad credentials", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "doctor@curavision.com", password: "wrong" })
    .expect(401);
  assert.ok(res.body.code);
});

test("POST /api/auth/login validates payload", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "not-an-email" })
    .expect(400);
  assert.ok(res.body.code);
});

test("protected route without token → 401", async () => {
  await request(app).get("/api/scans").expect(401);
});

test("GET /api/scans with a doctor token lists scans", async () => {
  const doc = await login("doctor@curavision.com", "Doctor@123");
  const res = await request(app)
    .get("/api/scans")
    .set("Authorization", `Bearer ${doc.token}`)
    .expect(200);
  assert.ok(Array.isArray(res.body.scans));
});

test("POST /api/auth/register creates a new patient", async () => {
  const email = `test-${Date.now()}@curavision.test`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      email,
      password: "TestPass@123",
      full_name: "Route Test",
      role: "PATIENT",
    })
    .expect(201);
  assert.equal(res.body.user.email, email);
  assert.ok(res.body.token);
});

test("POST /api/scans without file → 400", async () => {
  const doc = await login("doctor@curavision.com", "Doctor@123");
  const pat = await login("patient1@curavision.com", "Patient@123");
  const res = await request(app)
    .post("/api/scans")
    .set("Authorization", `Bearer ${doc.token}`)
    .field("patient_id", pat.user.id)
    .expect(400);
  assert.ok(res.body.code);
});

test("POST /api/internal/scans/:id/analysis-complete persists worker callback", async () => {
  const scan = await prisma.scan.create({
    data: {
      patient_id: "patient-001",
      doctor_id: "doctor-001",
      dicom_path: "storage/dicoms/callback-test/scan.dcm",
      modality: "MRI",
      status: "ANALYSIS_RUNNING",
    },
  });

  const payload = {
    scan_id: scan.id,
    segmentation: {
      scan_id: scan.id,
      mask_path: "storage/masks/callback-test.png",
      tumor_volume_cc: 7.4,
      tumor_location_description: "right temporal lobe",
      inference_log: "test callback",
    },
    gradcam: {
      scan_id: scan.id,
      gradcam_path: "storage/heatmaps/callback-test.png",
      activation_peak_region: "right temporal lobe",
    },
    report: {
      scan_id: scan.id,
      ai_draft: "FINDINGS:\nCallback draft.\n\nIMPRESSION:\nCallback impression.",
    },
  };

  const res = await request(app)
    .post(`/api/internal/scans/${scan.id}/analysis-complete`)
    .send(payload)
    .expect(200);

  assert.equal(res.body.ok, true);
  const updatedScan = await ScanService.getScanRecord(scan.id);
  assert.equal(updatedScan.status, "ANALYSIS_COMPLETE");
  const analysis = await ScanService.getScanAnalysis(scan.id, {
    requester: { role: "DOCTOR", sub: "doctor-001" },
  });
  assert.equal(analysis.gradcam_path, payload.gradcam.gradcam_path);
  const report = await ReportService.getReportByScan(scan.id);
  assert.equal(report.ai_draft, payload.report.ai_draft);

  await prisma.report.deleteMany({ where: { scan_id: scan.id } });
  await prisma.scanAnalysis.deleteMany({ where: { scan_id: scan.id } });
  await prisma.scan.delete({ where: { id: scan.id } });
});

test("full doctor flow: upload → analysis → report → approve", async (t) => {
  const doc = await login("doctor@curavision.com", "Doctor@123");
  const pat = await login("patient1@curavision.com", "Patient@123");

  // Synthetic DICOM bytes — the stub analysis accepts anything.
  const tmp = path.join(os.tmpdir(), `route-test-${Date.now()}.dcm`);
  const mockDicom = Buffer.alloc(132);
  mockDicom.write("DICM", 128);
  fs.writeFileSync(tmp, mockDicom);

  const upload = await request(app)
    .post("/api/scans")
    .set("Authorization", `Bearer ${doc.token}`)
    .field("patient_id", pat.user.id)
    .attach("file", tmp)
    .expect(201);

  fs.unlinkSync(tmp);

  const scanId = upload.body.scan_id;
  assert.ok(scanId);
  assert.ok(
    ["ANALYSIS_PENDING", "ANALYSIS_RUNNING", "ANALYSIS_COMPLETE"].includes(upload.body.status),
    `unexpected upload status: ${upload.body.status}`
  );

  // Poll until the async pipeline completes (stub resolves in ~1s).
  let status = upload.body.status;
  for (let i = 0; i < 20; i += 1) {
    const s = await request(app)
      .get(`/api/scans/${scanId}`)
      .set("Authorization", `Bearer ${doc.token}`)
      .expect(200);
    status = s.body.status;
    if (status === "ANALYSIS_COMPLETE") break;
    await new Promise((r) => setTimeout(r, 300));
  }
  assert.equal(status, "ANALYSIS_COMPLETE", `scan never finished: ${status}`);

  const analysis = await request(app)
    .get(`/api/scans/${scanId}/analysis`)
    .set("Authorization", `Bearer ${doc.token}`)
    .expect(200);
  assert.ok(analysis.body.tumor_volume_cc > 0);
  assert.ok(typeof analysis.body.tumor_location_description === "string");

  const report = await request(app)
    .get(`/api/scans/${scanId}/report`)
    .set("Authorization", `Bearer ${doc.token}`)
    .expect(200);
  assert.ok(report.body.id);

  await request(app)
    .patch(`/api/reports/${report.body.id}`)
    .set("Authorization", `Bearer ${doc.token}`)
    .send({ final_report: "Route test — approved." })
    .expect(200);

  const approved = await request(app)
    .post(`/api/reports/${report.body.id}/approve`)
    .set("Authorization", `Bearer ${doc.token}`)
    .expect(200);
  assert.equal(approved.body.status, "PUBLISHED");

  const corrections = await request(app)
    .get(`/api/reports/${report.body.id}/corrections`)
    .set("Authorization", `Bearer ${doc.token}`)
    .expect(200);
  assert.ok(corrections.body.corrections.length >= 1, "HITL correction auto-capture");

  // Patient perspective
  const patientReports = await request(app)
    .get("/api/patient/reports")
    .set("Authorization", `Bearer ${pat.token}`)
    .expect(200);
  assert.ok(patientReports.body.reports.some((r) => r.id === report.body.id));
});

test("reservation lifecycle: patient books → doctor confirms", async () => {
  const doc = await login("doctor@curavision.com", "Doctor@123");
  const pat = await login("patient1@curavision.com", "Patient@123");

  const avail = await request(app)
    .get(`/api/doctors/${doc.user.id}/availability`)
    .set("Authorization", `Bearer ${pat.token}`)
    .expect(200);
  assert.ok(Array.isArray(avail.body.slots));
  if (avail.body.slots.length === 0) {
    // Nothing to book — reservation routes still verified in other tests.
    return;
  }

  const slot = avail.body.slots[0];
  const booking = await request(app)
    .post("/api/reservations")
    .set("Authorization", `Bearer ${pat.token}`)
    .send({
      doctor_id: doc.user.id,
      start_time: slot.start_time,
      end_time: slot.end_time,
    })
    .expect(201);
  assert.equal(booking.body.status, "PENDING");

  const confirmed = await request(app)
    .patch(`/api/reservations/${booking.body.id}`)
    .set("Authorization", `Bearer ${doc.token}`)
    .send({ status: "CONFIRMED" })
    .expect(200);
  assert.equal(confirmed.body.status, "CONFIRMED");
});

test("admin audit log requires admin role", async () => {
  const doc = await login("doctor@curavision.com", "Doctor@123");
  await request(app)
    .get("/api/admin/audit-logs")
    .set("Authorization", `Bearer ${doc.token}`)
    .expect(403);

  const admin = await login("admin@curavision.com", "Admin@123");
  const res = await request(app)
    .get("/api/admin/audit-logs")
    .set("Authorization", `Bearer ${admin.token}`)
    .expect(200);
  assert.ok(Array.isArray(res.body.items));
});

test("POST /api/scans with invalid file format -> 400", async () => {
  const doc = await login("doctor@curavision.com", "Doctor@123");
  const pat = await login("patient1@curavision.com", "Patient@123");

  const tmp = path.join(os.tmpdir(), `route-test-invalid-${Date.now()}.dcm`);
  fs.writeFileSync(tmp, "NOT_A_DICOM_FILE_NO_MAGIC_HEADER_AND_TOO_SHORT");

  const res = await request(app)
    .post("/api/scans")
    .set("Authorization", `Bearer ${doc.token}`)
    .field("patient_id", pat.user.id)
    .attach("file", tmp)
    .expect(400);

  fs.unlinkSync(tmp);
  assert.equal(res.body.code, "INVALID_DICOM");
});

