const express = require("express");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const NotificationService = require("../services/NotificationService");

const router = express.Router();

// Require authentication for all notification routes
router.use(authenticateJWT);

/**
 * GET /api/notifications
 * Get recent notifications for the logged-in user.
 */
router.get("/", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const notifications = await NotificationService.getNotifications(req.user.id, limit);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read.
 */
router.patch("/:id/read", async (req, res, next) => {
  try {
    const notif = await NotificationService.markAsRead(req.params.id, req.user.id);
    res.json(notif);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the logged-in user.
 */
router.patch("/read-all", async (req, res, next) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user.id);
    res.json({ success: true, count: result.count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
