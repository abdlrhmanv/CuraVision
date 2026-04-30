const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const ReportService = require("../services/ReportService");

const router = express.Router();

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: errors.array() });
    return false;
  }
  return true;
}

/**
 * PATCH /api/reports/:id
 * Doctor edits the final_report text and (optionally) logs corrections.
 * Body: { final_report: string, corrections?: [{ field, old_value, new_value }] }
 */
router.patch(
  "/:id",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  [
    body("final_report").optional().isString(),
    body("corrections").optional().isArray(),
  ],
  (req, res, next) => {
    try {
      if (!validate(req, res)) return;
      const updated = ReportService.editReport(req.params.id, {
        requester: req.user,
        final_report: req.body.final_report,
        corrections: req.body.corrections,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reports/:id/approve
 * Doctor approves and publishes the report.
 */
router.post(
  "/:id/approve",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  (req, res, next) => {
    try {
      const approved = ReportService.approveReport(req.params.id, {
        requester: req.user,
      });
      res.json(approved);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reports/:id/corrections
 * Doctor retrieves HITL corrections for a report.
 */
router.get(
  "/:id/corrections",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  (req, res, next) => {
    try {
      const corrections = ReportService.getCorrections(req.params.id);
      res.json({ report_id: req.params.id, corrections });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
