const prisma = require("../config/prisma");

const DEFAULT_SLOT_MINUTES = 30;

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

class ReservationRepository {
  async listAvailability(doctorId) {
    return prisma.doctorAvailability.findMany({
      where: { doctor_id: doctorId },
    });
  }

  async computeAvailableSlots(doctorId, fromISO, toISO, slotMinutes = DEFAULT_SLOT_MINUTES) {
    const from = new Date(fromISO);
    const to = new Date(toISO);
    
    // Fetch doctor windows
    const windows = await this.listAvailability(doctorId);

    // Fetch existing active reservations for this doctor overlapping the date range
    // Since from/to might be broad, we can fetch all or just those within from/to.
    const busy = await prisma.reservation.findMany({
      where: {
        doctor_id: doctorId,
        status: { not: "CANCELLED" },
        end_time: { gt: from },
        start_time: { lt: to },
      },
    });

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

  async hasConflict(doctorId, startISO, endISO) {
    const s = new Date(startISO);
    const e = new Date(endISO);

    const conflicts = await prisma.reservation.findMany({
      where: {
        doctor_id: doctorId,
        status: { not: "CANCELLED" },
        start_time: { lt: e },
        end_time: { gt: s },
      },
    });

    return conflicts.length > 0;
  }

  async createReservation({ doctor_id, patient_id, start_time, end_time }) {
    return prisma.reservation.create({
      data: {
        doctor_id,
        patient_id,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        status: "PENDING",
      },
      include: { doctor: true, patient: true },
    });
  }

  async getReservationById(id) {
    return prisma.reservation.findUnique({
      where: { id },
      include: { doctor: true, patient: true },
    });
  }

  async updateReservationStatus(id, status) {
    return prisma.reservation.update({
      where: { id },
      data: { status },
      include: { doctor: true, patient: true },
    });
  }

  async listReservationsForUser(userId, role) {
    if (role === "DOCTOR") {
      return prisma.reservation.findMany({
        where: { doctor_id: userId },
        include: { patient: true },
        orderBy: { start_time: "desc" },
      });
    }
    if (role === "PATIENT") {
      return prisma.reservation.findMany({
        where: { patient_id: userId },
        include: { doctor: true },
        orderBy: { start_time: "desc" },
      });
    }
    return [];
  }
}

module.exports = new ReservationRepository();
