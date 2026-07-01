/**
 * Backend service unit tests — exercises AuthService and ReportService business logic.
 * Run with:  node --test tests/services.test.js
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const AuthService = require("../src/services/AuthService");
const ReportService = require("../src/services/ReportService");

test.describe("AuthService Unit Tests", () => {
  const uniqueEmail = `test-user-${Date.now()}@example.com`;
  const password = "Password@123";
  const fullName = "Test User";
  let createdUser = null;

  test("register() should successfully create a new user", async () => {
    createdUser = await AuthService.register({
      email: uniqueEmail,
      password,
      full_name: fullName,
      role: "PATIENT",
    });

    assert.ok(createdUser.id);
    assert.equal(createdUser.email, uniqueEmail);
    assert.equal(createdUser.full_name, fullName);
    assert.equal(createdUser.role, "PATIENT");
  });

  test("register() should fail when registering an email already in use", async () => {
    await assert.rejects(
      async () => {
        await AuthService.register({
          email: uniqueEmail,
          password,
          full_name: "Another User",
          role: "PATIENT",
        });
      },
      (err) => {
        assert.equal(err.code, "EMAIL_IN_USE");
        assert.equal(err.status, 409);
        return true;
      }
    );
  });

  test("login() should succeed with correct credentials", async () => {
    const user = await AuthService.login({
      email: uniqueEmail,
      password,
    });

    assert.ok(user.id);
    assert.equal(user.email, uniqueEmail);
    assert.equal(user.status, "ACTIVE");
  });

  test("login() should fail with incorrect password", async () => {
    await assert.rejects(
      async () => {
        await AuthService.login({
          email: uniqueEmail,
          password: "WrongPassword@123",
        });
      },
      (err) => {
        assert.equal(err.code, "INVALID_CREDENTIALS");
        assert.equal(err.status, 401);
        return true;
      }
    );
  });

  test("login() should fail with a non-existent email", async () => {
    await assert.rejects(
      async () => {
        await AuthService.login({
          email: "non-existent-email@example.com",
          password,
        });
      },
      (err) => {
        assert.equal(err.code, "INVALID_CREDENTIALS");
        assert.equal(err.status, 401);
        return true;
      }
    );
  });

  test("signToken() should sign a valid JWT token", () => {
    const token = AuthService.signToken(createdUser);
    assert.ok(token);
    assert.equal(typeof token, "string");
  });

  test("forgotPassword() should return a token when user exists", async () => {
    const result = await AuthService.forgotPassword(uniqueEmail);
    assert.ok(result);
    assert.ok(result.token);
    assert.equal(result.user.id, createdUser.id);
  });

  test("forgotPassword() should return null when user does not exist", async () => {
    const result = await AuthService.forgotPassword("non-existent@example.com");
    assert.equal(result, null);
  });

  test("resetPassword() should successfully update user password with valid token", async () => {
    const reset = await AuthService.forgotPassword(uniqueEmail);
    const success = await AuthService.resetPassword(reset.token, "NewPassword@123");
    assert.equal(success, true);

    // Verify login with new password works
    const loggedIn = await AuthService.login({
      email: uniqueEmail,
      password: "NewPassword@123",
    });
    assert.ok(loggedIn);
  });

  test("resetPassword() should fail with an invalid token", async () => {
    await assert.rejects(
      async () => {
        await AuthService.resetPassword("invalid-token-string", "NewPassword@123");
      },
      (err) => {
        assert.equal(err.code, "INVALID_TOKEN");
        assert.equal(err.status, 401);
        return true;
      }
    );
  });

  // Cleanup testing user
  test.after(async () => {
    if (createdUser) {
      await prisma.user.delete({ where: { id: createdUser.id } }).catch(() => {});
    }
  });
});

test.describe("ReportService Unit Tests", () => {
  let doctor = null;
  let patient = null;
  let scan = null;
  let report = null;

  test.before(async () => {
    // Setup temporary doctor, patient and scan records
    const stamp = Date.now();
    doctor = await prisma.user.create({
      data: {
        email: `doc-${stamp}@curavision.com`,
        password_hash: "mock-hash",
        full_name: "Service Test Doctor",
        role: "DOCTOR",
      },
    });

    patient = await prisma.user.create({
      data: {
        email: `pat-${stamp}@curavision.com`,
        password_hash: "mock-hash",
        full_name: "Service Test Patient",
        role: "PATIENT",
      },
    });

    scan = await prisma.scan.create({
      data: {
        patient_id: patient.id,
        doctor_id: doctor.id,
        modality: "MRI",
        status: "UPLOADED",
      },
    });
  });

  test("upsertDraftReport() should create a new DRAFT report", async () => {
    report = await ReportService.upsertDraftReport({
      scan_id: scan.id,
      patient_id: patient.id,
      doctor_id: doctor.id,
      ai_draft: "AI report draft findings details.",
    });

    assert.ok(report.id);
    assert.equal(report.scan_id, scan.id);
    assert.equal(report.status, "DRAFT");
    assert.equal(report.patient_visible, false);
    assert.equal(report.ai_draft, "AI report draft findings details.");
  });

  test("getReportById() should return report details", async () => {
    const fetched = await ReportService.getReportById(report.id);
    assert.ok(fetched);
    assert.equal(fetched.id, report.id);
    assert.equal(fetched.ai_draft, report.ai_draft);
  });

  test("getReportByScan() should return report details by scan ID", async () => {
    const fetched = await ReportService.getReportByScan(scan.id);
    assert.ok(fetched);
    assert.equal(fetched.id, report.id);
  });

  test.after(async () => {
    // Cleanup records in reverse order
    if (report) {
      await prisma.report.delete({ where: { id: report.id } }).catch(() => {});
    }
    if (scan) {
      await prisma.scan.delete({ where: { id: scan.id } }).catch(() => {});
    }
    if (patient) {
      await prisma.user.delete({ where: { id: patient.id } }).catch(() => {});
    }
    if (doctor) {
      await prisma.user.delete({ where: { id: doctor.id } }).catch(() => {});
    }
  });
});

test.after(async () => {
  const redis = require("../src/utils/redis");
  const prisma = require("../src/config/prisma");
  await redis.quit();
  await prisma.$disconnect();
});

