const express = require("express");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const ScanService = require("../services/ScanService");
const ReportService = require("../services/ReportService");
const UserService = require("../services/UserService");
const prisma = require("../config/prisma");

const router = express.Router();

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
      const scans = await ScanService.listByPatient(req.params.patientId);
      res.json({ patient_id: req.params.patientId, scans });
    } catch (err) {
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
      const reports = (await ReportService.listForPatient(req.user.sub)).map(
        stripClinical
      );
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
