process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");

const ScanService = require("../src/services/ScanService");
const prisma = require("../src/config/prisma");

test("doctorHasPatientRelationship returns true when a shared scan exists", async () => {
  const doctorId = "phase4-doctor-scan-rel";
  const patientId = "phase4-patient-scan-rel";

  await prisma.user.upsert({
    where: { email: "phase4-doctor-scan-rel@test.local" },
    update: { status: "ACTIVE", role: "DOCTOR" },
    create: {
      id: doctorId,
      email: "phase4-doctor-scan-rel@test.local",
      password_hash: "dummy",
      role: "DOCTOR",
      full_name: "Phase4 Doctor",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "phase4-patient-scan-rel@test.local" },
    update: { status: "ACTIVE", role: "PATIENT" },
    create: {
      id: patientId,
      email: "phase4-patient-scan-rel@test.local",
      password_hash: "dummy",
      role: "PATIENT",
      full_name: "Phase4 Patient",
      status: "ACTIVE",
    },
  });

  const scanId = "phase4-shared-scan";
  await prisma.scan.upsert({
    where: { id: scanId },
    update: { doctor_id: doctorId, patient_id: patientId },
    create: {
      id: scanId,
      doctor_id: doctorId,
      patient_id: patientId,
      status: "UPLOADED",
    },
  });

  const hasRelationship = await ScanService.doctorHasPatientRelationship(
    doctorId,
    patientId
  );
  assert.equal(hasRelationship, true);

  await prisma.scan.deleteMany({ where: { id: scanId } });
  await prisma.user.deleteMany({ where: { id: { in: [doctorId, patientId] } } });
});

test("uploadScan rejects non-doctor doctor_id", async () => {
  const patientId = "phase4-upload-patient";
  const fakeDoctorId = "phase4-upload-fake-doctor";

  await prisma.user.upsert({
    where: { email: "phase4-upload-patient@test.local" },
    update: { status: "ACTIVE", role: "PATIENT" },
    create: {
      id: patientId,
      email: "phase4-upload-patient@test.local",
      password_hash: "dummy",
      role: "PATIENT",
      full_name: "Upload Patient",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "phase4-upload-fake-doctor@test.local" },
    update: { status: "ACTIVE", role: "PATIENT" },
    create: {
      id: fakeDoctorId,
      email: "phase4-upload-fake-doctor@test.local",
      password_hash: "dummy",
      role: "PATIENT",
      full_name: "Not A Doctor",
      status: "ACTIVE",
    },
  });

  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

  await assert.rejects(
    () =>
      ScanService.uploadScan({
        file: { buffer: jpegHeader, originalname: "scan.jpg" },
        patientId,
        doctorId: fakeDoctorId,
      }),
    (err) => err.code === "INVALID_DOCTOR"
  );

  await prisma.user.deleteMany({ where: { id: { in: [patientId, fakeDoctorId] } } });
});

test.after(async () => {
  await prisma.$disconnect();
});
