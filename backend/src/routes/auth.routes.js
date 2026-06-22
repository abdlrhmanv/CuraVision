const express = require("express");
const { body, validationResult } = require("express-validator");
const AuthService = require("../services/AuthService");
const UserService = require("../services/UserService");
const AuditService = require("../services/AuditService");

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: errors.array() });
    return false;
  }
  return true;
}

/**
 * POST /api/auth/register
 * Public — create a PATIENT or DOCTOR account.
 *
 * Body: { email, password, full_name, role? }
 * Returns: { token, user }
 */
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("full_name")
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Full name is required."),
    body("role")
      .optional()
      .isIn(["PATIENT", "DOCTOR"])
      .withMessage("Role must be PATIENT or DOCTOR."),
  ],
  async (req, res, next) => {
    try {
      if (!handleValidation(req, res)) return;

      const { email, password, full_name, role = "PATIENT" } = req.body;
      const user = await AuthService.register({ email, password, full_name, role });

      AuditService.log({
        user_id: user.id,
        action: "REGISTER",
        entity_type: "USER",
        entity_id: user.id,
        metadata: { role: user.role },
      });

      const token = AuthService.signToken(user);
      res.status(201).json({ token, user: UserService.toPublicUser(user) });
    } catch (err) {
      if (err.code === "EMAIL_IN_USE") {
        return res.status(err.status).json({ code: err.code, message: err.message });
      }
      next(err);
    }
  }
);

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user: { id, role, full_name } }
 */
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  async (req, res, next) => {
    try {
      if (!handleValidation(req, res)) return;

      const { email, password } = req.body;
      const user = await AuthService.login({ email, password });

      AuditService.log({
        user_id: user.id,
        action: "LOGIN",
        entity_type: "USER",
        entity_id: user.id,
      });

      const token = AuthService.signToken(user);
      res.json({ token, user: UserService.toPublicUser(user) });
    } catch (err) {
      if (err.code === "INVALID_CREDENTIALS" || err.code === "ACCOUNT_DISABLED") {
        return res.status(err.status).json({ code: err.code, message: err.message });
      }
      next(err);
    }
  }
);

module.exports = router;

