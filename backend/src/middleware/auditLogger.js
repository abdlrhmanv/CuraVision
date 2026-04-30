const AuditService = require("../services/AuditService");

/**
 * Express middleware that attaches a request-scoped audit helper.
 *
 * Usage (from any downstream handler):
 *   req.audit({ action: "VIEW_SCAN", entity_type: "SCAN", entity_id: scan.id });
 *
 * The helper automatically fills in user_id from req.user.sub when available,
 * so handlers only need to describe what happened.
 */
function auditLogger(req, _res, next) {
  req.audit = (event) => {
    const userId = req.user?.sub ?? null;
    return AuditService.log({ user_id: userId, ...event });
  };
  next();
}

module.exports = { auditLogger };
