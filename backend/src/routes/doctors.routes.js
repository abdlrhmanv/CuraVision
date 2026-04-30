const express = require("express");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const ReservationService = require("../services/ReservationService");
const { USERS, toPublicUser } = require("../mockData/users");

const router = express.Router();

/**
 * GET /api/doctors
 * Any authenticated user can list doctors for reservation UI.
 */
router.get("/", authenticateJWT, (_req, res) => {
  const doctors = USERS.filter(
    (u) => u.role === "DOCTOR" && u.status === "ACTIVE"
  ).map(toPublicUser);
  res.json({ doctors });
});

/**
 * GET /api/doctors/:id/availability
 * Query: from, to (ISO datetimes). Defaults to next 7 days from now.
 */
router.get(
  "/:id/availability",
  authenticateJWT,
  authorizeRole("PATIENT", "DOCTOR"),
  (req, res, next) => {
    try {
      const now = new Date();
      const defaultTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const from = req.query.from ? new Date(req.query.from) : now;
      const to = req.query.to ? new Date(req.query.to) : defaultTo;

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "from/to must be valid ISO datetimes.",
        });
      }
      if (to <= from) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "`to` must be after `from`.",
        });
      }

      const slots = ReservationService.getAvailability(req.params.id, {
        from: from.toISOString(),
        to: to.toISOString(),
      });
      res.json({
        doctor_id: req.params.id,
        from: from.toISOString(),
        to: to.toISOString(),
        slots,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
