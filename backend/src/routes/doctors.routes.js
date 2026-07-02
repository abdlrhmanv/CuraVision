const express = require("express");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const ReservationService = require("../services/ReservationService");
const UserService = require("../services/UserService");
const prisma = require("../config/prisma");

const router = express.Router();

/**
 * GET /api/doctors
 */
router.get("/", authenticateJWT, async (_req, res, next) => {
  try {
    const { users } = await UserService.listUsers({
      role: "DOCTOR",
      status: "ACTIVE",
      limit: 200,
    });
    res.json({ doctors: users });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/doctors/:id/patients
 * Patients this doctor has scanned at least once.
 */
router.get(
  "/:id/patients",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  async (req, res, next) => {
    try {
      if (req.user.sub !== req.params.id && req.user.role !== "ADMIN") {
        return res.status(403).json({
          code: "FORBIDDEN",
          message: "You can only list your own patients.",
        });
      }

      const scans = await prisma.scan.findMany({
        where: { doctor_id: req.params.id },
        select: {
          patient_id: true,
          uploaded_at: true,
          patient: {
            select: {
              id: true,
              full_name: true,
              email: true,
              status: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
        orderBy: { uploaded_at: "desc" },
      });

      const byPatient = new Map();
      for (const scan of scans) {
        if (!byPatient.has(scan.patient_id)) {
          byPatient.set(scan.patient_id, {
            id: scan.patient.id,
            full_name: scan.patient.full_name,
            email: scan.patient.email,
            status: scan.patient.status,
            created_at: scan.patient.created_at.toISOString(),
            updated_at: scan.patient.updated_at.toISOString(),
            total_scans: 0,
            pending_reports: 0,
            last_scan_date: scan.uploaded_at.toISOString(),
          });
        }
        const entry = byPatient.get(scan.patient_id);
        entry.total_scans += 1;
      }

      res.json({ patients: Array.from(byPatient.values()) });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/doctors/:id/availability
 */
router.get(
  "/:id/availability",
  authenticateJWT,
  authorizeRole("PATIENT", "DOCTOR"),
  async (req, res, next) => {
    try {
      const now = new Date();
      const defaultTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const from = req.query.from ? new Date(req.query.from) : now;
      const to = req.query.to ? new Date(req.query.to) : defaultTo;

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "from/to must be valid ISO datetimes.",
        });
      }
      if (to <= from) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "`to` must be after `from`.",
        });
      }

      const slots = await ReservationService.getAvailability(req.params.id, {
        from: from.toISOString(),
        to: to.toISOString(),
      });
      res.json({
        doctor_id: req.params.id,
        from: from.toISOString(),
        to: to.toISOString(),
        slots,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/doctors/:id/availability/rules
 */
router.get(
  "/:id/availability/rules",
  authenticateJWT,
  authorizeRole("DOCTOR", "ADMIN"),
  async (req, res, next) => {
    try {
      if (req.user.sub !== req.params.id && req.user.role !== "ADMIN") {
        return res.status(403).json({
          code: "FORBIDDEN",
          message: "You can only view your own availability rules.",
        });
      }

      const rules = await prisma.doctorAvailability.findMany({
        where: { doctor_id: req.params.id },
        orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
      });

      res.json({ rules });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/doctors/:id/availability/rules
 */
router.post(
  "/:id/availability/rules",
  authenticateJWT,
  authorizeRole("DOCTOR", "ADMIN"),
  async (req, res, next) => {
    try {
      if (req.user.sub !== req.params.id && req.user.role !== "ADMIN") {
        return res.status(403).json({
          code: "FORBIDDEN",
          message: "You can only manage your own availability rules.",
        });
      }

      const { day_of_week, start_time, end_time } = req.body;

      const day = parseInt(day_of_week, 10);
      if (Number.isNaN(day) || day < 0 || day > 6) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "day_of_week must be an integer between 0 and 6.",
        });
      }

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "start_time and end_time must be in HH:MM format.",
        });
      }

      if (start_time >= end_time) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "end_time must be after start_time.",
        });
      }

      const existing = await prisma.doctorAvailability.findFirst({
        where: {
          doctor_id: req.params.id,
          day_of_week: day,
          start_time: { lt: end_time },
          end_time: { gt: start_time },
        },
      });

      if (existing) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "This availability rule already exists.",
        });
      }

      const rule = await prisma.doctorAvailability.create({
        data: {
          doctor_id: req.params.id,
          day_of_week: day,
          start_time,
          end_time,
        },
      });

      res.status(201).json({ rule });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/doctors/:id/availability/rules/:ruleId
 */
router.delete(
  "/:id/availability/rules/:ruleId",
  authenticateJWT,
  authorizeRole("DOCTOR", "ADMIN"),
  async (req, res, next) => {
    try {
      if (req.user.sub !== req.params.id && req.user.role !== "ADMIN") {
        return res.status(403).json({
          code: "FORBIDDEN",
          message: "You can only delete your own availability rules.",
        });
      }

      const rule = await prisma.doctorAvailability.findUnique({
        where: { id: req.params.ruleId },
      });

      if (!rule) {
        return res.status(404).json({
          code: "NOT_FOUND",
          message: "Availability rule not found.",
        });
      }

      if (rule.doctor_id !== req.params.id) {
        return res.status(403).json({
          code: "FORBIDDEN",
          message: "This rule does not belong to the specified doctor.",
        });
      }

      await prisma.doctorAvailability.delete({
        where: { id: req.params.ruleId },
      });

      res.json({ ok: true, message: "Availability rule deleted successfully." });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/doctors/:id/profile
 */
router.get(
  "/:id/profile",
  authenticateJWT,
  authorizeRole("DOCTOR", "ADMIN", "PATIENT"),
  async (req, res, next) => {
    try {
      const doctor = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          full_name: true,
          email: true,
          doctorProfile: {
            select: {
              specialty: true,
              subspecialties: true,
              years_experience: true,
              hospital: true,
              phone: true,
              bio: true,
              license_number: true,
              education: true,
              qualifications: true,
              board_certifications: true,
              certifications: true,
              country: true,
              city: true,
              languages_spoken: true,
              consultation_fee: true,
              date_of_birth: true,
            }
          },
          doctorPreferences: {
            select: {
              preferred_ai_model: true,
              enable_ai_suggestions: true,
              default_report_template: true,
              notification_email: true,
              notification_sms: true,
              notification_push: true,
              notification_critical: true,
            }
          }
        },
      });

      if (!doctor || !doctor.doctorProfile) {
        return res.status(404).json({
          code: "NOT_FOUND",
          message: "Doctor profile not found.",
        });
      }

      // Flatten object to match API client contract
      const { doctorProfile, doctorPreferences, ...userInfo } = doctor;
      
      const flatDoctor = {
        user_id: doctor.id,
        email: doctor.email,
        full_name: doctor.full_name,
        ...doctorProfile,
        ...(doctorPreferences || {
          preferred_ai_model: "GPT-5",
          enable_ai_suggestions: true,
          default_report_template: "Brain MRI",
          notification_email: true,
          notification_sms: false,
          notification_push: true,
          notification_critical: true,
        }),
      };

      res.json({ doctor: flatDoctor });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/doctors/:id/profile
 */
router.put(
  "/:id/profile",
  authenticateJWT,
  authorizeRole("DOCTOR", "ADMIN"),
  async (req, res, next) => {
    try {
      if (req.user.sub !== req.params.id && req.user.role !== "ADMIN") {
        return res.status(403).json({
          code: "FORBIDDEN",
          message: "You can only update your own profile.",
        });
      }

      const {
        full_name,
        specialty,
        subspecialties,
        hospital,
        years_experience,
        phone,
        bio,
        education,
        qualifications,
        board_certifications,
        country,
        city,
        languages_spoken,
        consultation_fee,
        date_of_birth,
        // Preferences
        preferred_ai_model,
        enable_ai_suggestions,
        default_report_template,
        notification_email,
        notification_sms,
        notification_push,
        notification_critical,
      } = req.body;

      const profileData = {
        specialty: specialty !== undefined ? specialty : undefined,
        subspecialties: subspecialties !== undefined ? subspecialties : undefined,
        hospital: hospital !== undefined ? hospital : undefined,
        years_experience: years_experience !== undefined ? parseInt(years_experience, 10) : undefined,
        phone: phone !== undefined ? phone : undefined,
        bio: bio !== undefined ? bio : undefined,
        education: education !== undefined ? education : undefined,
        qualifications: qualifications !== undefined ? qualifications : undefined,
        board_certifications: board_certifications !== undefined ? board_certifications : undefined,
        country: country !== undefined ? country : undefined,
        city: city !== undefined ? city : undefined,
        languages_spoken: languages_spoken !== undefined ? languages_spoken : undefined,
        consultation_fee: consultation_fee !== undefined ? parseFloat(consultation_fee) : undefined,
        date_of_birth: date_of_birth !== undefined ? (date_of_birth ? new Date(date_of_birth) : null) : undefined,
      };

      const prefData = {
        preferred_ai_model: preferred_ai_model !== undefined ? preferred_ai_model : undefined,
        enable_ai_suggestions: enable_ai_suggestions !== undefined ? enable_ai_suggestions : undefined,
        default_report_template: default_report_template !== undefined ? default_report_template : undefined,
        notification_email: notification_email !== undefined ? notification_email : undefined,
        notification_sms: notification_sms !== undefined ? notification_sms : undefined,
        notification_push: notification_push !== undefined ? notification_push : undefined,
        notification_critical: notification_critical !== undefined ? notification_critical : undefined,
      };

      // Update User (full_name) and DoctorProfile in a transaction
      const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
          where: { id: req.params.id },
          data: { full_name: full_name !== undefined ? full_name : undefined },
        }),
        prisma.doctorProfile.upsert({
          where: { user_id: req.params.id },
          create: {
            user_id: req.params.id,
            license_number: `DOC-${Date.now()}`, // Fallback if no profile existed
            ...profileData,
          },
          update: profileData,
        }),
        prisma.doctorPreferences.upsert({
          where: { user_id: req.params.id },
          create: {
            user_id: req.params.id,
            ...prefData,
          },
          update: prefData,
        })
      ]);

      res.json({ ok: true, message: "Profile updated successfully." });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/doctors/:id/stats
 */
router.get(
  "/:id/stats",
  authenticateJWT,
  authorizeRole("DOCTOR", "ADMIN", "PATIENT"),
  async (req, res, next) => {
    try {
      // Find total patients
      const patientScans = await prisma.scan.findMany({
        where: { doctor_id: req.params.id },
        select: { patient_id: true }
      });
      const uniquePatients = new Set(patientScans.map(s => s.patient_id)).size;

      // Find total reports reviewed/completed (status = REVIEWED or PUBLISHED)
      const reportsCount = await prisma.report.count({
        where: { 
          doctor_id: req.params.id,
          status: { in: ["REVIEWED", "PUBLISHED"] }
        }
      });

      // Find total AI assisted reviews (Scans where analysis exists)
      // For simplicity, count all ScanAnalysis related to this doctor's scans
      const aiAnalysesCount = await prisma.scanAnalysis.count({
        where: {
          scan: { doctor_id: req.params.id }
        }
      });

      res.json({
        total_patients: uniquePatients,
        total_reports_reviewed: reportsCount,
        total_ai_analyses: aiAnalysesCount
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
