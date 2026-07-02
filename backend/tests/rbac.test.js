process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN = "*";
process.env.RATE_LIMIT_MAX = "10000";
process.env.AUTH_RATE_LIMIT_MAX = "10000";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/server");
const prisma = require("../src/config/prisma");
const jwt = require("jsonwebtoken");

// Helper to generate a token with custom role/id
function generateTestToken(userId, role, extra = {}) {
  return jwt.sign(
    { sub: userId, role, full_name: `${role} User`, ...extra },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

test("RBAC - Test Cases Suite", async (t) => {
  // Setup users for testing
  const patientAId = "patient-a-id-test";
  const patientBId = "patient-b-id-test";
  const doctorAId = "doctor-a-id-test";
  const doctorBId = "doctor-b-id-test";
  const adminId = "admin-id-test";

  const patientAToken = generateTestToken(patientAId, "PATIENT");
  const patientBToken = generateTestToken(patientBId, "PATIENT");
  const doctorAToken = generateTestToken(doctorAId, "DOCTOR");
  const doctorBToken = generateTestToken(doctorBId, "DOCTOR");
  const adminToken = generateTestToken(adminId, "ADMIN");

  // Create patient users in the database so foreign keys work
  await prisma.user.upsert({
    where: { email: "patienta@rbac.test" },
    update: {},
    create: {
      id: patientAId,
      email: "patienta@rbac.test",
      password_hash: "dummy",
      role: "PATIENT",
      full_name: "Patient A",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "patientb@rbac.test" },
    update: {},
    create: {
      id: patientBId,
      email: "patientb@rbac.test",
      password_hash: "dummy",
      role: "PATIENT",
      full_name: "Patient B",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "doctora@rbac.test" },
    update: {},
    create: {
      id: doctorAId,
      email: "doctora@rbac.test",
      password_hash: "dummy",
      role: "DOCTOR",
      full_name: "Doctor A",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "doctorb@rbac.test" },
    update: {},
    create: {
      id: doctorBId,
      email: "doctorb@rbac.test",
      password_hash: "dummy",
      role: "DOCTOR",
      full_name: "Doctor B",
      status: "ACTIVE",
    },
  });

  // Create scan and report for Patient B assigned to Doctor B
  const scanBId = "scan-b-id-test";
  await prisma.scan.upsert({
    where: { id: scanBId },
    update: {},
    create: {
      id: scanBId,
      patient_id: patientBId,
      doctor_id: doctorBId,
      dicom_path: "storage/dicoms/test.dcm",
      status: "ANALYSIS_COMPLETE",
    },
  });

  const reportBId = "report-b-id-test";
  await prisma.report.upsert({
    where: { id: reportBId },
    update: {},
    create: {
      id: reportBId,
      scan_id: scanBId,
      patient_id: patientBId,
      doctor_id: doctorBId,
      status: "DRAFT",
      ai_draft: "AI report content",
      final_report: "Doctor final report content",
    },
  });

  await t.test("TC-RBAC-001 & 002: Route Protection between Patient & Doctor", async () => {
    // Patient attempts to access Doctor-only listing API -> returns 403
    const res1 = await request(app)
      .get("/api/patients")
      .set("Authorization", `Bearer ${patientAToken}`)
      .expect(403);
    assert.equal(res1.body.code, "FORBIDDEN");

    // Doctor attempts to access Patient-only reports API -> returns 403
    const res2 = await request(app)
      .get("/api/patient/reports")
      .set("Authorization", `Bearer ${doctorAToken}`)
      .expect(403);
    assert.equal(res2.body.code, "FORBIDDEN");
  });

  await t.test("TC-RBAC-003: Admin Route Protection (Doctor trying to access Admin API)", async () => {
    // Doctor attempts to access Admin audit logs -> returns 403
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${doctorAToken}`)
      .expect(403);
    assert.equal(res.body.code, "FORBIDDEN");
  });

  await t.test("TC-RBAC-004 & 005: Unauthenticated Route Access & API Authentication Required", async () => {
    // Attempting to access protected API without token -> returns 401
    const res = await request(app)
      .get("/api/scans")
      .expect(401);
    assert.equal(res.body.code, "MISSING_TOKEN");
  });

  await t.test("TC-RBAC-006: Patient Scan Isolation (Patient A cannot view Scan B)", async () => {
    // Patient A attempts to view Scan B -> returns 403 (since route /api/scans/:id requires DOCTOR role)
    const res = await request(app)
      .get(`/api/scans/${scanBId}`)
      .set("Authorization", `Bearer ${patientAToken}`)
      .expect(403);
    assert.equal(res.body.code, "FORBIDDEN");
  });

  await t.test("TC-RBAC-007: Doctor Scan Access Verification (Doctor can view assigned scans)", async () => {
    // Doctor B accesses Scan B -> returns 200
    const res = await request(app)
      .get(`/api/scans/${scanBId}`)
      .set("Authorization", `Bearer ${doctorBToken}`)
      .expect(200);
    assert.equal(res.body.id, scanBId);
  });

  await t.test("TC-RBAC-008: Doctor Cross-Patient Isolation (Doctor A cannot access scan assigned to Doctor B)", async () => {
    // Doctor A attempts to view Scan B -> returns 403 (since Doctor A is not assigned to Scan B)
    const res = await request(app)
      .get(`/api/scans/${scanBId}`)
      .set("Authorization", `Bearer ${doctorAToken}`)
      .expect(403);
    assert.equal(res.body.code, "FORBIDDEN");
  });

  await t.test("TC-RBAC-009: Report Edit Role Restriction (Patient cannot edit reports)", async () => {
    // Patient attempts to edit report B -> returns 403
    const res = await request(app)
      .patch(`/api/reports/${reportBId}`)
      .set("Authorization", `Bearer ${patientAToken}`)
      .send({ final_report: "Tampered" })
      .expect(403);
    assert.equal(res.body.code, "FORBIDDEN");
  });

  await t.test("TC-RBAC-010: Report Approval Restriction (Patient cannot approve reports)", async () => {
    // Patient attempts to approve report B -> returns 403
    const res = await request(app)
      .post(`/api/reports/${reportBId}/approve`)
      .set("Authorization", `Bearer ${patientAToken}`)
      .expect(403);
    assert.equal(res.body.code, "FORBIDDEN");
  });

  await t.test("TC-RBAC-011: Admin Privilege Verification (Admin can read audit logs)", async () => {
    // Admin accesses audit logs -> returns 200
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    assert.ok(Array.isArray(res.body.items));
  });

  await t.test("TC-RBAC-012: Role Escalation Attempt (Role update cannot be forced)", async () => {
    // Patient attempts to self-escalate by calling registration/update with role: DOCTOR.
    // Registering with an existing email should fail with conflict.
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "patienta@rbac.test",
        password: "EscalatedPass@123",
        full_name: "Hacker Patient",
        role: "DOCTOR",
      })
      .expect(409); // EMAIL_IN_USE conflict, preventing re-registration or hijacking
  });

  await t.test("TC-RBAC-013: Audit Log Isolation (Doctor cannot read audit logs)", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${doctorBToken}`)
      .expect(403);
    assert.equal(res.body.code, "FORBIDDEN");
  });

  await t.test("TC-RBAC-014: Token Forgery Verification (Invalid signature)", async () => {
    const tamperedToken = jwt.sign(
      { sub: patientAId, role: "ADMIN", full_name: "Forged Admin" },
      "wrong-signing-secret"
    );
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${tamperedToken}`)
      .expect(401);
    assert.equal(res.body.code, "INVALID_TOKEN");
  });

  await t.test("TC-RBAC-015: Route Access Matrix Validation (Invalid role/Guest token)", async () => {
    const guestToken = generateTestToken("guest-id", "GUEST");
    const res = await request(app)
      .get("/api/scans")
      .set("Authorization", `Bearer ${guestToken}`)
      .expect(403);
    assert.equal(res.body.code, "FORBIDDEN");
  });

  // Cleanup testing records
  await prisma.report.deleteMany({ where: { id: reportBId } });
  await prisma.scan.deleteMany({ where: { id: scanBId } });
  await prisma.user.deleteMany({ where: { id: { in: [patientAId, patientBId, doctorAId, doctorBId] } } });
});

test.after(async () => {
  const redis = require("../src/utils/redis");
  const { redisClient } = require("../src/integrations/redisClient");
  const { stopQueueProcessor } = require("../src/services/AuditService");
  const prisma = require("../src/config/prisma");
  stopQueueProcessor();
  await redis.quit();
  await redisClient.quit();
  await prisma.$disconnect();
});
