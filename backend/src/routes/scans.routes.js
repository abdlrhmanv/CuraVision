const express = require("express");
const multer = require("multer");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const ScanService = require("../services/ScanService");
const ReportService = require("../services/ReportService");

const router = express.Router();

/**
 * GET /api/scans
 * Return scans belonging to the authenticated doctor, with patient context.
 */
router.get(
  "/",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  async (req, res, next) => {
    try {
      const scans = await ScanService.listByDoctor(req.user.sub);
      res.json({ scans });
    } catch (err) {
      next(err);
    }
  }
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

/**
 * POST /api/scans
 * Doctor uploads a DICOM file and triggers analysis.
 */
router.post(
  "/",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const patientId = req.body.patient_id;
      if (!patientId) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "patient_id is required.",
        });
      }

      const result = await ScanService.uploadScan({
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
 */
router.get(
  "/:id",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  async (req, res, next) => {
    try {
      const scan = await ScanService.getScanSummary(req.params.id, {
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
 */
router.get(
  "/:id/analysis",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  async (req, res, next) => {
    try {
      const analysis = await ScanService.getScanAnalysis(req.params.id, {
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
 */
router.get(
  "/:id/report",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  async (req, res, next) => {
    try {
      await ScanService.getScanSummary(req.params.id, {
        requester: req.user,
      });
      const report = await ReportService.getReportByScan(req.params.id);
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

/**
 * GET /api/scans/:id/status-stream
 * SSE endpoint for real-time analysis status updates.
 */
router.get(
  "/:id/status-stream",
  authenticateJWT,
  async (req, res, next) => {
    try {
      const scanId = req.params.id;
      // verify access
      await ScanService.getScanSummary(scanId, { requester: req.user });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      let lastStatus = null;

      const checkStatus = async () => {
        try {
          const scan = await ScanService.getScanRecord(scanId);
          if (scan && scan.status !== lastStatus) {
            lastStatus = scan.status;
            res.write(`data: ${JSON.stringify({ status: scan.status })}\n\n`);
            if (["ANALYSIS_COMPLETE", "FAILED"].includes(scan.status)) {
              clearInterval(interval);
              res.end();
            }
          }
        } catch (err) {
          clearInterval(interval);
          res.end();
        }
      };

      await checkStatus();
      const interval = setInterval(checkStatus, 2000);

      req.on("close", () => {
        clearInterval(interval);
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
