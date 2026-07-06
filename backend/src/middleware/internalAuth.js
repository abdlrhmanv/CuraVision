const crypto = require("crypto");
const logger = require("../utils/logger");

/**
 * Validates service-to-service calls (e.g. Celery worker callbacks).
 * Expects X-Internal-Token to match INTERNAL_SERVICE_TOKEN.
 */
function internalAuth(req, res, next) {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  const provided = req.headers["x-internal-token"];

  if (!expected || typeof expected !== "string" || expected.trim() === "") {
    logger.error("[internalAuth] INTERNAL_SERVICE_TOKEN is not configured");
    return res.status(503).json({
      code: "SERVICE_MISCONFIGURED",
      message: "Internal service authentication is not configured.",
    });
  }

  if (!provided || typeof provided !== "string") {
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Invalid internal token.",
    });
  }

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Invalid internal token.",
    });
  }

  return next();
}

module.exports = internalAuth;
