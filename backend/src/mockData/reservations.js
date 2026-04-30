const { randomUUID } = require("crypto");

/**
 * In-memory reservations and doctor availability windows.
 * Replaces the PostgreSQL `reservations` and `doctor_availability` tables.
 */

/** @type {object[]} */
const RESERVATIONS = [];

/**
 * Doctor recurring weekly availability.
 * day_of_week: 0 (Sun) .. 6 (Sat)
 * times stored as "HH:mm" strings.
 */
const AVAILABILITY = [
  { id: randomUUID(), doctor_id: "doctor-001", day_of_week: 1, start_time: "09:00", end_time: "12:00" },
  { id: randomUUID(), doctor_id: "doctor-001", day_of_week: 3, start_time: "14:00", end_time: "17:00" },
  { id: randomUUID(), doctor_id: "doctor-001", day_of_week: 5, start_time: "10:00", end_time: "13:00" },
];

const DEFAULT_SLOT_MINUTES = 30;

function listAvailability(doctorId) {
  return AVAILABILITY.filter((a) => a.doctor_id === doctorId);
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * Compute concrete bookable slots for a doctor within a date window.
 * Filters out slots overlapping existing non-cancelled reservations.
 *
 * @param {string} doctorId
 * @param {string} fromISO  Inclusive ISO datetime.
 * @param {string} toISO    Exclusive ISO datetime.
 * @param {number} [slotMinutes]
 */
function computeAvailableSlots(doctorId, fromISO, toISO, slotMinutes = DEFAULT_SLOT_MINUTES) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const windows = listAvailability(doctorId);

  const busy = RESERVATIONS.filter(
    (r) => r.doctor_id === doctorId && r.status !== "CANCELLED"
  );

  const slots = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor < to) {
    const dow = cursor.getUTCDay();
    const dayWindows = windows.filter((w) => w.day_of_week === dow);

    for (const w of dayWindows) {
      const [sh, sm] = w.start_time.split(":").map(Number);
      const [eh, em] = w.end_time.split(":").map(Number);

      const dayStart = new Date(cursor);
      dayStart.setUTCHours(sh, sm, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setUTCHours(eh, em, 0, 0);

      for (
        let slotStart = new Date(dayStart);
        slotStart.getTime() + slotMinutes * 60_000 <= dayEnd.getTime();
        slotStart = new Date(slotStart.getTime() + slotMinutes * 60_000)
      ) {
        const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);
        if (slotStart < from || slotEnd > to) continue;

        const conflict = busy.some((r) =>
          rangesOverlap(
            new Date(r.start_time),
            new Date(r.end_time),
            slotStart,
            slotEnd
          )
        );
        if (!conflict) {
          slots.push({
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString(),
          });
        }
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return slots;
}

function hasConflict(doctorId, startISO, endISO) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  return RESERVATIONS.some(
    (r) =>
      r.doctor_id === doctorId &&
      r.status !== "CANCELLED" &&
      rangesOverlap(new Date(r.start_time), new Date(r.end_time), s, e)
  );
}

function createReservation({ doctor_id, patient_id, start_time, end_time }) {
  const now = new Date().toISOString();
  const reservation = {
    id: randomUUID(),
    doctor_id,
    patient_id,
    start_time,
    end_time,
    status: "PENDING",
    created_at: now,
    updated_at: now,
  };
  RESERVATIONS.push(reservation);
  return reservation;
}

function getReservationById(id) {
  return RESERVATIONS.find((r) => r.id === id) ?? null;
}

function updateReservationStatus(id, status) {
  const r = getReservationById(id);
  if (!r) return null;
  r.status = status;
  r.updated_at = new Date().toISOString();
  return r;
}

function listReservationsForUser(userId, role) {
  if (role === "DOCTOR") {
    return RESERVATIONS.filter((r) => r.doctor_id === userId);
  }
  if (role === "PATIENT") {
    return RESERVATIONS.filter((r) => r.patient_id === userId);
  }
  return [];
}

module.exports = {
  RESERVATIONS,
  AVAILABILITY,
  listAvailability,
  computeAvailableSlots,
  hasConflict,
  createReservation,
  getReservationById,
  updateReservationStatus,
  listReservationsForUser,
};
