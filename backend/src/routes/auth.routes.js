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
      const refreshToken = AuthService.signRefreshToken(user);
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        maxAge: 15 * 60 * 1000, // 15m
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
      });
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
      const refreshToken = AuthService.signRefreshToken(user);
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        maxAge: 15 * 60 * 1000, // 15m
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
      });
      res.json({ token, user: UserService.toPublicUser(user) });
    } catch (err) {
      if (err.code === "INVALID_CREDENTIALS" || err.code === "ACCOUNT_DISABLED") {
        return res.status(err.status).json({ code: err.code, message: err.message });
      }
      next(err);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Explicit endpoint to manually refresh access token using the HttpOnly refreshToken cookie.
 */
router.post("/refresh", async (req, res, next) => {
  try {
    const cookieHeader = req.headers["cookie"];
    const cookies = {};
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        cookies[parts[0].trim()] = (parts[1] || "").trim();
      });
    }

    const refreshToken = cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        code: "MISSING_REFRESH_TOKEN",
        message: "Refresh token is required.",
      });
    }

    const payload = AuthService.verifyRefreshToken(refreshToken);

    const token = AuthService.signToken(payload);
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: 15 * 60 * 1000, // 15m
    });

    res.json({
      token,
      user: {
        id: payload.sub,
        role: payload.role,
        full_name: payload.full_name,
      },
    });
  } catch (err) {
    res.status(401).json({
      code: "SESSION_EXPIRED",
      message: "Session has expired. Please log in again.",
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Public — request password reset token.
 */
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail().withMessage("Valid email is required.")],
  async (req, res, next) => {
    try {
      if (!handleValidation(req, res)) return;

      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);

      // Always return 200 to prevent user enumeration attacks
      if (!result) {
        return res.json({ message: "If the email exists, a reset link has been sent." });
      }

      const nodemailer = require("nodemailer");
      const logger = require("../utils/logger");

      let transporter;
      const fromEmail = process.env.SMTP_FROM || '"CuraVision" <noreply@curavision.app>';

      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const port = parseInt(process.env.SMTP_PORT, 10) || 587;
        const secure = process.env.SMTP_SECURE === "true" || port === 465;
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
      } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
      }

      const info = await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: "Reset your CuraVision password",
        text: `Hello ${result.user.full_name},\n\nYou requested a password reset. Use the following token to reset your password:\n\n${result.token}\n\nThis link will expire in 1 hour.`,
        html: `<p>Hello <b>${result.user.full_name}</b>,</p><p>You requested a password reset. Use the following token to reset your password:</p><pre>${result.token}</pre><p>This link will expire in 1 hour.</p>`,
      });

      if (process.env.SMTP_HOST) {
        logger.info(`Password reset email sent to ${email} (MessageID: ${info.messageId})`);
      } else {
        logger.info("Password reset email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }

      res.json({ message: "If the email exists, a reset link has been sent." });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Public — submit new password using token.
 */
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required."),
    body("new_password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
  ],
  async (req, res, next) => {
    try {
      if (!handleValidation(req, res)) return;

      const { token, new_password } = req.body;
      await AuthService.resetPassword(token, new_password);

      res.json({ ok: true, message: "Password has been successfully reset." });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/logout
 * Clears the HttpOnly authentication token cookie.
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.clearCookie("refreshToken");
  res.json({ ok: true });
});

module.exports = router;

