const express = require("express");
const ScanService = require("../services/ScanService");

const router = express.Router();

/**
 * POST /api/internal/scans/:scanId/analysis-complete
 */
router.post("/scans/:scanId/analysis-complete", async (req, res, next) => {
  try {
    const result = await ScanService.completeAnalysis(
      req.params.scanId,
      req.body ?? {}
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
