const express = require("express");
const multer = require("multer");
const fs = require("fs");
const os = require("os");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const ScanService = require("../services/ScanService");
const ReportService = require("../services/ReportService");
const UserService = require("../services/UserService");
const prisma = require("../config/prisma");

const router = express.Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

/**
 * GET /api/patients
 * Doctors list active patients for upload / roster views.
 */
router.get(
  "/",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  async (req, res, next) => {
    try {
      const { users } = await UserService.listUsers({
        role: "PATIENT",
        status: "ACTIVE",
        limit: 200,
      });

      const scanStats = await prisma.scan.groupBy({
        by: ["patient_id"],
        _count: { id: true },
        _max: { uploaded_at: true },
      });
      const reportStats = await prisma.report.groupBy({
        by: ["patient_id"],
        where: { status: "DRAFT" },
        _count: { id: true },
      });

      const scansByPatient = new Map(
        scanStats.map((row) => [row.patient_id, row])
      );
      const draftsByPatient = new Map(
        reportStats.map((row) => [row.patient_id, row._count.id])
      );

      const patients = users.map((user) => {
        const scans = scansByPatient.get(user.id);
        return {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          status: user.status,
          created_at: user.created_at,
          updated_at: user.updated_at,
          total_scans: scans?._count.id ?? 0,
          pending_reports: draftsByPatient.get(user.id) ?? 0,
          last_scan_date: scans?._max.uploaded_at?.toISOString() ?? null,
        };
      });

      res.json({ patients });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/patients/:patientId/scans
 */
router.get(
  "/:patientId/scans",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  async (req, res, next) => {
    try {
      const scans = await ScanService.listByPatient(req.params.patientId, {
        doctorId: req.user.sub,
      });
      res.json({ patient_id: req.params.patientId, scans });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/patient/scans
 * Returns scans belonging to the authenticated patient.
 */
router.get(
  "/scans",
  authenticateJWT,
  authorizeRole("PATIENT"),
  async (req, res, next) => {
    try {
      const scans = await ScanService.listByPatient(req.user.sub);
      res.json({ scans });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/patient/scans
 * Patient uploads a DICOM file and selects a doctor to examine it.
 */
router.post(
  "/scans",
  authenticateJWT,
  authorizeRole("PATIENT"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const doctorId = req.body.doctor_id;
      if (!doctorId) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "doctor_id is required.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          code: "FILE_REQUIRED",
          message: "DICOM file is required.",
        });
      }

      const fileBuffer = fs.readFileSync(req.file.path);
      const fileObj = {
        buffer: fileBuffer,
        originalname: req.file.originalname,
      };

      const result = await ScanService.uploadScan({
        file: fileObj,
        patientId: req.user.sub,
        doctorId,
      });

      fs.unlink(req.file.path, () => {});
      res.status(201).json(result);
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      next(err);
    }
  }
);

/**
 * GET /api/patient/reports
 */
router.get(
  "/reports",
  authenticateJWT,
  authorizeRole("PATIENT"),
  async (req, res, next) => {
    try {
      const reports = (
        await ReportService.listForPatient(req.user.sub, {
          doctorId: req.query.doctor_id || undefined,
        })
      ).map(stripClinical);
      res.json({ reports });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/patient/reports/:id
 */
router.get(
  "/reports/:id",
  authenticateJWT,
  authorizeRole("PATIENT"),
  async (req, res, next) => {
    try {
      const report = await ReportService.getForPatient(
        req.params.id,
        req.user.sub
      );
      req.audit?.({
        action: "VIEW_REPORT",
        entity_type: "REPORT",
        entity_id: report.id,
      });
      res.json(stripClinical(report));
    } catch (err) {
      next(err);
    }
  }
);

function stripClinical(report) {
  const { ai_draft, ...rest } = report;
  return rest;
}

/**
 * GET /api/patient/profile
 */
router.get(
  "/profile",
  authenticateJWT,
  authorizeRole("PATIENT"),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.sub },
        include: { patientProfile: true, patientPreferences: true },
      });
      if (!user) {
        return res.status(404).json({ code: "NOT_FOUND", message: "User not found." });
      }
      const profile = user.patientProfile || {};
      const prefs = user.patientPreferences || {};
      res.json({
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        date_of_birth: profile.date_of_birth?.toISOString().slice(0, 10) ?? null,
        gender: profile.gender ?? null,
        phone: profile.phone ?? null,
        country: profile.country ?? null,
        city: profile.city ?? null,
        address: profile.address ?? null,
        blood_type: profile.blood_type ?? null,
        height_cm: profile.height_cm ?? null,
        weight_kg: profile.weight_kg ?? null,
        medical_history: profile.medical_history ?? null,
        allergies: profile.allergies ?? null,
        chronic_diseases: profile.chronic_diseases ?? null,
        current_medications: profile.current_medications ?? null,
        previous_surgeries: profile.previous_surgeries ?? null,
        family_medical_history: profile.family_medical_history ?? null,
        smoking_status: profile.smoking_status ?? null,
        alcohol_status: profile.alcohol_status ?? null,
        emergency_contact: profile.emergency_contact ?? null,
        preferred_language: prefs.preferred_language ?? "English",
        notification_email: prefs.notification_email ?? true,
        notification_sms: prefs.notification_sms ?? false,
        notification_push: prefs.notification_push ?? true,
        share_anonymized_scans: prefs.share_anonymized_scans ?? true,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/patient/profile
 */
router.patch(
  "/profile",
  authenticateJWT,
  authorizeRole("PATIENT"),
  async (req, res, next) => {
    try {
      const {
        full_name,
        phone, date_of_birth, gender, country, city, address, blood_type, height_cm, weight_kg,
        medical_history, allergies, chronic_diseases, current_medications, previous_surgeries,
        family_medical_history, smoking_status, alcohol_status, emergency_contact,
        preferred_language, notification_email, notification_sms, notification_push, share_anonymized_scans
      } = req.body;

      if (full_name) {
        await prisma.user.update({
          where: { id: req.user.sub },
          data: { full_name }
        });
      }

      const profileData = {};
      if (phone !== undefined) profileData.phone = phone;
      if (date_of_birth !== undefined) {
        profileData.date_of_birth = date_of_birth ? new Date(date_of_birth) : null;
      }
      if (gender !== undefined) profileData.gender = gender;
      if (country !== undefined) profileData.country = country;
      if (city !== undefined) profileData.city = city;
      if (address !== undefined) profileData.address = address;
      if (blood_type !== undefined) profileData.blood_type = blood_type;
      if (height_cm !== undefined) profileData.height_cm = height_cm;
      if (weight_kg !== undefined) profileData.weight_kg = weight_kg;
      if (medical_history !== undefined) profileData.medical_history = medical_history;
      if (allergies !== undefined) profileData.allergies = allergies;
      if (chronic_diseases !== undefined) profileData.chronic_diseases = chronic_diseases;
      if (current_medications !== undefined) profileData.current_medications = current_medications;
      if (previous_surgeries !== undefined) profileData.previous_surgeries = previous_surgeries;
      if (family_medical_history !== undefined) profileData.family_medical_history = family_medical_history;
      if (smoking_status !== undefined) profileData.smoking_status = smoking_status;
      if (alcohol_status !== undefined) profileData.alcohol_status = alcohol_status;
      if (emergency_contact !== undefined) profileData.emergency_contact = emergency_contact;

      if (Object.keys(profileData).length > 0) {
        await prisma.patientProfile.upsert({
          where: { user_id: req.user.sub },
          create: { user_id: req.user.sub, ...profileData },
          update: profileData,
        });
      }

      const prefsData = {};
      if (preferred_language !== undefined) prefsData.preferred_language = preferred_language;
      if (notification_email !== undefined) prefsData.notification_email = notification_email;
      if (notification_sms !== undefined) prefsData.notification_sms = notification_sms;
      if (notification_push !== undefined) prefsData.notification_push = notification_push;
      if (share_anonymized_scans !== undefined) prefsData.share_anonymized_scans = share_anonymized_scans;

      if (Object.keys(prefsData).length > 0) {
        await prisma.patientPreferences.upsert({
          where: { user_id: req.user.sub },
          create: { user_id: req.user.sub, ...prefsData },
          update: prefsData,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.sub },
        include: { patientProfile: true, patientPreferences: true },
      });
      const profile = user.patientProfile || {};
      const prefs = user.patientPreferences || {};
      res.json({
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        date_of_birth: profile.date_of_birth?.toISOString().slice(0, 10) ?? null,
        gender: profile.gender ?? null,
        phone: profile.phone ?? null,
        country: profile.country ?? null,
        city: profile.city ?? null,
        address: profile.address ?? null,
        blood_type: profile.blood_type ?? null,
        height_cm: profile.height_cm ?? null,
        weight_kg: profile.weight_kg ?? null,
        medical_history: profile.medical_history ?? null,
        allergies: profile.allergies ?? null,
        chronic_diseases: profile.chronic_diseases ?? null,
        current_medications: profile.current_medications ?? null,
        previous_surgeries: profile.previous_surgeries ?? null,
        family_medical_history: profile.family_medical_history ?? null,
        smoking_status: profile.smoking_status ?? null,
        alcohol_status: profile.alcohol_status ?? null,
        emergency_contact: profile.emergency_contact ?? null,
        preferred_language: prefs.preferred_language ?? "English",
        notification_email: prefs.notification_email ?? true,
        notification_sms: prefs.notification_sms ?? false,
        notification_push: prefs.notification_push ?? true,
        share_anonymized_scans: prefs.share_anonymized_scans ?? true,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/patient/stats
 * Returns real aggregate stats for the authenticated patient's dashboard.
 */
router.get(
  "/stats",
  authenticateJWT,
  authorizeRole("PATIENT"),
  async (req, res, next) => {
    try {
      const patientId = req.user.sub;

      const [totalScans, totalReports, totalAppointments] = await Promise.all([
        prisma.scan.count({ where: { patient_id: patientId } }),
        prisma.report.count({
          where: { patient_id: patientId, patient_visible: true },
        }),
        prisma.reservation.count({ where: { patient_id: patientId } }),
      ]);

      res.json({
        total_scans: totalScans,
        total_reports: totalReports,
        total_appointments: totalAppointments,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
