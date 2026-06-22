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

router.patch(
  "/:id",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  [
    body("final_report").optional().isString(),
    body("corrections").optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;
      const updated = await ReportService.editReport(req.params.id, {
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

router.post(
  "/:id/approve",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  async (req, res, next) => {
    try {
      const approved = await ReportService.approveReport(req.params.id, {
        requester: req.user,
      });
      res.json(approved);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id/corrections",
  authenticateJWT,
  authorizeRole("DOCTOR"),
  async (req, res, next) => {
    try {
      const corrections = await ReportService.getCorrections(req.params.id);
      res.json({ report_id: req.params.id, corrections });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
