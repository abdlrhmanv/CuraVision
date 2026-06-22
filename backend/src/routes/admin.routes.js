const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const AuditService = require("../services/AuditService");
const UserService = require("../services/UserService");

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
 * GET /api/admin/audit-logs
 * Query: user_id, action, entity_type, entity_id, from, to, limit, offset
 */
router.get(
  "/audit-logs",
  authenticateJWT,
  authorizeRole("ADMIN"),
  async (req, res, next) => {
    try {
      const {
        user_id,
        action,
        entity_type,
        entity_id,
        from,
        to,
        limit,
        offset,
      } = req.query;

      const result = await AuditService.search({
        user_id,
        action,
        entity_type,
        entity_id,
        from,
        to,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/users
 * List/search users with optional filters.
 */
router.get(
  "/users",
  authenticateJWT,
  authorizeRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { query, role, status, limit, offset } = req.query;
      const result = await UserService.listUsers({
        query,
        role,
        status,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/admin/users/:id
 * Update a user's role, status, or display name.
 */
router.patch(
  "/users/:id",
  authenticateJWT,
  authorizeRole("ADMIN"),
  [
    body("role").optional().isIn(["PATIENT", "DOCTOR", "ADMIN"]),
    body("status").optional().isIn(["ACTIVE", "DISABLED"]),
    body("full_name").optional().isString().isLength({ min: 1, max: 255 }),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;

      const user = await UserService.findUserById(req.params.id);
      if (!user) {
        return res.status(404).json({
          code: "USER_NOT_FOUND",
          message: "User not found.",
        });
      }

      const updated = await UserService.updateUser(req.params.id, {
        role: req.body.role,
        status: req.body.status,
        full_name: req.body.full_name,
      });

      AuditService.log({
        user_id: req.user.sub,
        action: "ADMIN_UPDATE_USER",
        entity_type: "USER",
        entity_id: req.params.id,
        metadata: {
          role: req.body.role,
          status: req.body.status,
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
