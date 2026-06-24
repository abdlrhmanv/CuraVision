const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticateJWT } = require("../middleware/authenticateJWT");
const { authorizeRole } = require("../middleware/authorizeRole");
const ReservationService = require("../services/ReservationService");

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
 * GET /api/reservations
 * Returns reservations belonging to the authenticated user.
 */
router.get(
  "/",
  authenticateJWT,
  authorizeRole("PATIENT", "DOCTOR"),
  async (req, res, next) => {
    try {
      const list = await ReservationService.listForUser(req.user);
      res.json({ reservations: list });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reservations
 * Patient books an appointment with a doctor.
 * Body: { doctor_id, start_time, end_time }
 */
router.post(
  "/",
  authenticateJWT,
  authorizeRole("PATIENT"),
  [
    body("doctor_id").isString().notEmpty().withMessage("doctor_id is required."),
    body("start_time").isISO8601().withMessage("start_time must be ISO-8601."),
    body("end_time").isISO8601().withMessage("end_time must be ISO-8601."),
  ],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;
      const reservation = await ReservationService.book({
        requester: req.user,
        doctor_id: req.body.doctor_id,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
      });
      res.status(201).json(reservation);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/reservations/:id
 * Update the status of a reservation (confirm/cancel/complete).
 * Body: { status }
 */
router.patch(
  "/:id",
  authenticateJWT,
  authorizeRole("PATIENT", "DOCTOR"),
  [body("status").isString().notEmpty().withMessage("status is required.")],
  async (req, res, next) => {
    try {
      if (!validate(req, res)) return;
      const updated = await ReservationService.updateStatus(req.params.id, {
        requester: req.user,
        status: req.body.status,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
