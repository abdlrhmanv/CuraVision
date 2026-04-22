const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const { postMessage, getChatHistory } = require("../controllers/chat.controller");

const router = express.Router();

/**
 * POST /api/chat/:reportId/message
 * Patients only — send a message and get a chatbot reply.
 */
router.post(
  "/:reportId/message",
  authenticateJWT,
  authorizeRole("PATIENT"),
  [
    body("message")
      .trim()
      .notEmpty()
      .withMessage("Message cannot be empty.")
      .isLength({ max: 1000 })
      .withMessage("Message must be 1000 characters or fewer."),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ code: "VALIDATION_ERROR", errors: errors.array() });
    }
    next();
  },
  postMessage
);

/**
 * GET /api/chat/:reportId/history
 * Patients only — retrieve the full conversation history.
 */
router.get(
  "/:reportId/history",
  authenticateJWT,
  authorizeRole("PATIENT"),
  getChatHistory
);

module.exports = router;
