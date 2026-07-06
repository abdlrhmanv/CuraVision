const express = require("express");
const internalAuth = require("../middleware/internalAuth");
const ScanService = require("../services/ScanService");

const router = express.Router();

router.use(internalAuth);

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

/**
 * POST /api/internal/scans/:scanId/analysis-failed
 */
router.post("/scans/:scanId/analysis-failed", async (req, res, next) => {
  try {
    const { error } = req.body ?? {};
    const result = await ScanService.failAnalysis(
      req.params.scanId,
      error || "Unknown error during AI analysis"
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
