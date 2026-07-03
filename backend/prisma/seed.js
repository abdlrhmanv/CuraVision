/**
 * Prisma seed — populates a fresh Postgres database with the same demo
 * data currently held in src/mockData/* so developers can switch from
 * the in-memory backend to the real DB without losing fixtures.
 *
 *   cd backend
 *   DATABASE_URL=postgresql://user:pass@localhost:5432/curavision \
 *     npx prisma db seed
 */
const { PrismaClient } = require("@prisma/client");
const { USERS } = require("../src/mockData/users");
const { REPORTS } = require("../src/mockData/reports");

// Inline availability fixtures (reservations.js was removed from mockData)
const AVAILABILITY = [
  {
    id: "avail-001",
    doctor_id: "doctor-001",
    day_of_week: 1, // Monday
    start_time: "09:00",
    end_time: "17:00",
  },
  {
    id: "avail-002",
    doctor_id: "doctor-001",
    day_of_week: 3, // Wednesday
    start_time: "09:00",
    end_time: "17:00",
  },
  {
    id: "avail-003",
    doctor_id: "doctor-001",
    day_of_week: 5, // Friday
    start_time: "10:00",
    end_time: "15:00",
  },
];

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding users...");
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        password_hash: u.password_hash,
        role: u.role,
        full_name: u.full_name,
        status: u.status ?? "ACTIVE",
        created_at: new Date(u.created_at ?? Date.now()),
      },
    });
  }

  console.log("Seeding doctor availability...");
  for (const a of AVAILABILITY) {
    await prisma.doctorAvailability.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        doctor_id: a.doctor_id,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
      },
    });
  }

  
  console.log("Seeding doctor profiles...");
  for (const u of USERS.filter(u => u.role === "DOCTOR")) {
    await prisma.doctorProfile.upsert({
      where: { user_id: u.id },
      update: {},
      create: {
        user_id: u.id,
        specialty: "Neurology",
        subspecialties: ["Brain Tumors", "Stroke"],
        license_number: "LIC-" + u.id.substring(0, 8),
        years_experience: 12,
        hospital: "Ain Shams University Hospital",
        bio: "Consultant Neurologist specializing in neuro-oncology and stroke management.",
        phone: "+201000000000",
      },
    });

    await prisma.doctorPreferences.upsert({
      where: { user_id: u.id },
      update: {},
      create: {
        user_id: u.id,
        preferred_ai_model: "llama-3.3-70b-versatile",
      },
    });
  }

  console.log("Seeding demo scans + reports...");
  for (const r of REPORTS) {
    await prisma.scan.upsert({
      where: { id: r.scan_id },
      update: {},
      create: {
        id: r.scan_id,
        patient_id: r.patient_id,
        doctor_id: r.doctor_id,
        dicom_path: null,
        modality: "MRI",
        status: "ANALYSIS_COMPLETE",
      },
    });

    await prisma.scanAnalysis.upsert({
      where: { scan_id: r.scan_id },
      update: {},
      create: {
        scan_id: r.scan_id,
        unet_mask_path: `storage/masks/${r.scan_id}.png`,
        gradcam_path: `storage/heatmaps/${r.scan_id}.png`,
        tumor_volume_cc: r.scan_id === "scan-001" ? 12.3 : 2.1,
        tumor_location_description:
          r.scan_id === "scan-001"
            ? "left frontal lobe"
            : "right temporal lobe",
        inference_log: "seed fixture",
      },
    });

    await prisma.report.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        scan_id: r.scan_id,
        patient_id: r.patient_id,
        doctor_id: r.doctor_id,
        status: r.status,
        patient_visible: r.patient_visible,
        ai_draft: r.ai_draft,
        final_report: r.final_report,
      },
    });
  }

  console.log("Seeding extra realistic demo scans (Pending/Failed)...");
  await prisma.scan.upsert({
    where: { id: "scan-003" },
    update: {},
    create: {
      id: "scan-003",
      patient_id: "patient-001",
      doctor_id: "doctor-001",
      dicom_path: null,
      modality: "CT",
      status: "ANALYSIS_PENDING",
    },
  });

  await prisma.scan.upsert({
    where: { id: "scan-004" },
    update: {},
    create: {
      id: "scan-004",
      patient_id: "patient-002",
      doctor_id: "doctor-001",
      dicom_path: null,
      modality: "MRI",
      status: "FAILED",
    },
  });

  await prisma.scan.upsert({
    where: { id: "scan-005" },
    update: {},
    create: {
      id: "scan-005",
      patient_id: "patient-001",
      doctor_id: "doctor-001",
      dicom_path: "storage/scans/scan-005.dcm",
      modality: "MRI",
      status: "UPLOADED",
    },
  });

  console.log("Seeding patient profiles...");
  await prisma.patientProfile.upsert({
    where: { user_id: "patient-001" },
    update: {},
    create: {
      user_id: "patient-001",
      date_of_birth: new Date("1995-03-15"),
      gender: "FEMALE",
      phone: "+20 10 1234 5678",
      country: "Egypt",
      medical_history: "Neurological follow-up; migraine history.",
      allergies: "None reported",
    },
  });
  await prisma.patientProfile.upsert({
    where: { user_id: "patient-002" },
    update: {},
    create: {
      user_id: "patient-002",
      date_of_birth: new Date("1988-07-22"),
      gender: "MALE",
      phone: "+20 11 9876 5432",
      country: "Egypt",
      medical_history: "Post-contrast MRI evaluation.",
      allergies: "Penicillin",
    },
  });

  console.log("Seeding draft report (hidden from patient)...");
  await prisma.report.upsert({
    where: { id: "report-draft-001" },
    update: {},
    create: {
      id: "report-draft-001",
      scan_id: "scan-005",
      patient_id: "patient-001",
      doctor_id: "doctor-001",
      status: "DRAFT",
      patient_visible: false,
      ai_draft: "Draft AI findings — not yet reviewed by doctor.",
      final_report: null,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
