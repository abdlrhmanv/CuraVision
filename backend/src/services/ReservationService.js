const {
  computeAvailableSlots,
  hasConflict,
  createReservation,
  getReservationById,
  updateReservationStatus,
  listReservationsForUser,
} = require("../mockData/reservations");
const { findUserById } = require("../mockData/users");
const AuditService = require("./AuditService");

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function getAvailability(doctorId, { from, to }) {
  const doctor = findUserById(doctorId);
  if (!doctor || doctor.role !== "DOCTOR") {
    throw httpError(404, "DOCTOR_NOT_FOUND", "Doctor not found.");
  }
  return computeAvailableSlots(doctorId, from, to);
}

function book({ requester, doctor_id, start_time, end_time }) {
  const doctor = findUserById(doctor_id);
  if (!doctor || doctor.role !== "DOCTOR") {
    throw httpError(404, "DOCTOR_NOT_FOUND", "Doctor not found.");
  }

  const start = new Date(start_time);
  const end = new Date(end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw httpError(400, "INVALID_TIME", "start_time and end_time must be valid ISO datetimes.");
  }
  if (end <= start) {
    throw httpError(400, "INVALID_RANGE", "end_time must be after start_time.");
  }
  if (start.getTime() < Date.now()) {
    throw httpError(400, "PAST_TIME", "Cannot book an appointment in the past.");
  }
  if (hasConflict(doctor_id, start_time, end_time)) {
    throw httpError(409, "SLOT_UNAVAILABLE", "This slot is no longer available.");
  }

  const reservation = createReservation({
    doctor_id,
    patient_id: requester.sub,
    start_time,
    end_time,
  });

  AuditService.log({
    user_id: requester.sub,
    action: "BOOK_RESERVATION",
    entity_type: "RESERVATION",
    entity_id: reservation.id,
    metadata: { doctor_id, start_time, end_time },
  });

  return reservation;
}

function updateStatus(reservationId, { requester, status }) {
  const allowed = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];
  if (!allowed.includes(status)) {
    throw httpError(400, "INVALID_STATUS", `Status must be one of: ${allowed.join(", ")}.`);
  }

  const reservation = getReservationById(reservationId);
  if (!reservation) {
    throw httpError(404, "RESERVATION_NOT_FOUND", "Reservation not found.");
  }

  const isDoctor = requester.role === "DOCTOR" && reservation.doctor_id === requester.sub;
  const isPatient = requester.role === "PATIENT" && reservation.patient_id === requester.sub;
  if (!isDoctor && !isPatient) {
    throw httpError(403, "FORBIDDEN", "You cannot modify this reservation.");
  }

  if (status === "CONFIRMED" && !isDoctor) {
    throw httpError(403, "FORBIDDEN", "Only the doctor can confirm a reservation.");
  }

  const updated = updateReservationStatus(reservationId, status);

  AuditService.log({
    user_id: requester.sub,
    action: "UPDATE_RESERVATION",
    entity_type: "RESERVATION",
    entity_id: reservationId,
    metadata: { new_status: status },
  });

  return updated;
}

function listForUser(requester) {
  return listReservationsForUser(requester.sub, requester.role);
}

module.exports = {
  getAvailability,
  book,
  updateStatus,
  listForUser,
};
