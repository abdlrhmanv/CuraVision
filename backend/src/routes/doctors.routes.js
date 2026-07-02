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

module.exports = router;
