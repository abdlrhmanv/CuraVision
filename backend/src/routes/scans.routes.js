const express = require("express");
const multer = require("multer");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const ScanService = require("../services/ScanService");
const { listScansByDoctor } = require("../mockData/scans");
const { findUserById } = require("../mockData/users");
const { getReportByScan } = require("../mockData/reports");

const router = express.Router();

/**
 * GET /api/scans
 * Return scans belonging to the authenticated doctor, with a small bit of
 * patient context so the UI can render a table without extra fetches.
 */
router.get(
  "/",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  (req, res, next) => {
    try {
      const scans = listScansByDoctor(req.user.sub).map((scan) => {
        const patient = findUserById(scan.patient_id);
        const report = getReportByScan(scan.id);
        return {
          ...scan,
          patient_name: patient?.full_name ?? null,
          report_id: report?.id ?? null,
          report_status: report?.status ?? null,
        };
      });
      res.json({ scans });
    } catch (err) {
      next(err);
    }
  }
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB cap for DICOM buffers
});

/**
 * POST /api/scans
 * Doctor uploads a DICOM file and triggers analysis.
 * Multipart form: file (DICOM), patient_id
 */
router.post(
  "/",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  upload.single("file"),
  (req, res, next) => {
    try {
      const patientId = req.body.patient_id;
      if (!patientId) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "patient_id is required.",
        });
      }

      const result = ScanService.uploadScan({
        file: req.file,
        patientId,
        doctorId: req.user.sub,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/scans/:id
 * Return metadata and status for a scan.
 */
router.get(
  "/:id",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  (req, res, next) => {
    try {
      const scan = ScanService.getScanSummary(req.params.id, {
        requester: req.user,
      });
      req.audit?.({
        action: "VIEW_SCAN",
        entity_type: "SCAN",
        entity_id: scan.id,
      });
      res.json(scan);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/scans/:id/analysis
 * Return segmentation + Grad-CAM analysis for a scan.
 */
router.get(
  "/:id/analysis",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  (req, res, next) => {
    try {
      const analysis = ScanService.getScanAnalysis(req.params.id, {
        requester: req.user,
      });
      req.audit?.({
        action: "VIEW_ANALYSIS",
        entity_type: "SCAN",
        entity_id: req.params.id,
      });
      res.json(analysis);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/scans/:id/report
 * Return the draft/final report attached to a scan.
 */
router.get(
  "/:id/report",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  (req, res, next) => {
    try {
      const scan = ScanService.getScanSummary(req.params.id, {
        requester: req.user,
      });
      const report = getReportByScan(scan.id);
      if (!report) {
        return res.status(404).json({
          code: "REPORT_NOT_READY",
          message: "Report is not available yet.",
        });
      }
      req.audit?.({
        action: "VIEW_REPORT",
        entity_type: "REPORT",
        entity_id: report.id,
      });
      res.json(report);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
