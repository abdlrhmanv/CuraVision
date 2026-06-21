const express = require("express");
const ScanService = require("../services/ScanService");

const router = express.Router();

/**
 * POST /api/internal/scans/:scanId/analysis-complete
 * Internal callback used by the AI worker after async analysis finishes.
 */
router.post("/scans/:scanId/analysis-complete", (req, res, next) => {
  try {
    const result = ScanService.completeAnalysis(req.params.scanId, req.body ?? {});
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
