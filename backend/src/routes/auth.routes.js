const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const {
  findUserByEmail,
  createUser,
  toPublicUser,
} = require("../mockData/users");
const AuditService = require("../services/AuditService");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

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
  (req, res, next) => {
    try {
      if (!handleValidation(req, res)) return;

      const { email, password, full_name, role = "PATIENT" } = req.body;
      const user = createUser({ email, password, full_name, role });

      AuditService.log({
        user_id: user.id,
        action: "REGISTER",
        entity_type: "USER",
        entity_id: user.id,
        metadata: { role: user.role },
      });

      const token = signToken(user);
      res.status(201).json({ token, user: toPublicUser(user) });
    } catch (err) {
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
      const user = findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect.",
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect.",
        });
      }

      if (user.status && user.status !== "ACTIVE") {
        return res.status(403).json({
          code: "ACCOUNT_DISABLED",
          message: "This account is not active.",
        });
      }

      AuditService.log({
        user_id: user.id,
        action: "LOGIN",
        entity_type: "USER",
        entity_id: user.id,
      });

      const token = signToken(user);
      res.json({ token, user: toPublicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
