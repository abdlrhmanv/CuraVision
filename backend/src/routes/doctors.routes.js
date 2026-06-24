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

module.exports = router;
