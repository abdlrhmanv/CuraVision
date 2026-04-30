const express = require("express");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const ScanService = require("../services/ScanService");
const ReportService = require("../services/ReportService");

const router = express.Router();

/**
 * GET /api/patients/:patientId/scans
 * Doctor lists scans for a given patient.
 */
router.get(
  "/:patientId/scans",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  (req, res, next) => {
    try {
      const scans = ScanService.listByPatient(req.params.patientId);
      res.json({ patient_id: req.params.patientId, scans });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/patient/reports
 * Patient views all of their published reports.
 */
router.get(
  "/reports",
  authenticateJWT,
  authorizeRole("PATIENT"),
  (req, res, next) => {
    try {
      const reports = ReportService.listForPatient(req.user.sub).map(stripClinical);
      res.json({ reports });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/patient/reports/:id
 * Patient views a single published report.
 */
router.get(
  "/reports/:id",
  authenticateJWT,
  authorizeRole("PATIENT"),
  (req, res, next) => {
    try {
      const report = ReportService.getForPatient(req.params.id, req.user.sub);
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

/** Hide internal fields patients should not see. */
function stripClinical(report) {
  const { ai_draft, ...rest } = report;
  return rest;
}

module.exports = router;
