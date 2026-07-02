const ReservationRepository = require("../repositories/ReservationRepository");
const prisma = require("../config/prisma");
const AuditService = require("./AuditService");
const nodemailer = require("nodemailer");
const logger = require("../config/logger");

const { notFound, forbidden, conflict, badRequest } = require("../utils/AppError");
async function getAvailability(doctorId, { from, to }) {
  const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
  if (!doctor || doctor.role !== "DOCTOR") {
    throw notFound("Doctor not found.", "DOCTOR_NOT_FOUND");
  }
  return ReservationRepository.computeAvailableSlots(doctorId, from, to);
}

async function book({ requester, doctor_id, start_time, end_time }) {
  const doctor = await prisma.user.findUnique({ where: { id: doctor_id } });
  if (!doctor || doctor.role !== "DOCTOR") {
    throw notFound("Doctor not found.", "DOCTOR_NOT_FOUND");
  }

  const start = new Date(start_time);
  const end = new Date(end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw badRequest("start_time and end_time must be valid ISO datetimes.", "INVALID_TIME");
  }
  if (end <= start) {
    throw badRequest("end_time must be after start_time.", "INVALID_RANGE");
  }
  if (start.getTime() < Date.now()) {
    throw badRequest("Cannot book an appointment in the past.", "PAST_TIME");
  }

  // Atomic conflict check + insert under serializable isolation to prevent
  // TOCTOU double-booking race conditions.
  const reservation = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.reservation.findFirst({
        where: {
          doctor_id,
          status: { not: "CANCELLED" },
          start_time: { lt: end },
          end_time: { gt: start },
        },
      });
      if (existing) {
        throw conflict("This slot is no longer available.", "SLOT_UNAVAILABLE");
      }
      return tx.reservation.create({
        data: {
          doctor_id,
          patient_id: requester.sub,
          start_time: start,
          end_time: end,
          status: "PENDING",
        },
        include: { doctor: true, patient: true },
      });
    },
    { isolationLevel: "Serializable" }
  );

  AuditService.log({
    user_id: requester.sub,
    action: "BOOK_RESERVATION",
    entity_type: "RESERVATION",
    entity_id: reservation.id,
    metadata: { doctor_id, start_time, end_time },
  });

  return reservation;
}

async function updateStatus(reservationId, { requester, status }) {
  const allowed = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];
  if (!allowed.includes(status)) {
    throw badRequest(`Status must be one of: ${allowed.join(", ")}.`, "INVALID_STATUS");
  }

  const reservation = await ReservationRepository.getReservationById(reservationId);
  if (!reservation) {
    throw notFound("Reservation not found.", "RESERVATION_NOT_FOUND");
  }

  const isDoctor = requester.role === "DOCTOR" && reservation.doctor_id === requester.sub;
  const isPatient = requester.role === "PATIENT" && reservation.patient_id === requester.sub;
  if (!isDoctor && !isPatient) {
    throw forbidden("You cannot modify this reservation.");
  }

  if (status === "CONFIRMED" && !isDoctor) {
    throw forbidden("Only the doctor can confirm a reservation.");
  }

  const updated = await ReservationRepository.updateReservationStatus(reservationId, status);

  AuditService.log({
    user_id: requester.sub,
    action: "UPDATE_RESERVATION",
    entity_type: "RESERVATION",
    entity_id: reservationId,
    metadata: { new_status: status },
  });

  if (status === "CONFIRMED" || status === "CANCELLED") {
    sendNotificationEmail(reservation.patient_id, updated).catch(err => 
      logger.error({ err }, "Failed to send reservation notification email")
    );
  }

  return updated;
}

async function sendNotificationEmail(patientId, reservation) {
  const user = await prisma.user.findUnique({ where: { id: patientId } });
  if (!user || !user.email) return;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn("SMTP credentials not configured. Skipping email.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const timeString = new Date(reservation.start_time).toLocaleString();
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"CuraVision Appointments" <noreply@curavision.app>',
    to: user.email,
    subject: `Appointment ${reservation.status}`,
    text: `Hello ${user.full_name},\n\nYour appointment scheduled for ${timeString} has been ${reservation.status}.\n\nBest,\nThe CuraVision Team`,
    html: `<p>Hello <b>${user.full_name}</b>,</p><p>Your appointment scheduled for <b>${timeString}</b> has been <b>${reservation.status}</b>.</p><br><p>Best,<br>The CuraVision Team</p>`,
  });
}

async function listForUser(requester) {
  return ReservationRepository.listReservationsForUser(requester.sub, requester.role);
}

module.exports = {
  getAvailability,
  book,
  updateStatus,
  listForUser,
};
