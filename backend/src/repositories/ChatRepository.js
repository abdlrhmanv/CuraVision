const prisma = require("../config/prisma");

class ChatRepository {
  async findSession(reportId, patientId) {
    return prisma.chatSession.findUnique({
      where: {
        patient_id_report_id: {
          patient_id: patientId,
          report_id: reportId,
        },
      },
    });
  }

  async createSession(reportId, patientId) {
    return prisma.chatSession.create({
      data: {
        report_id: reportId,
        patient_id: patientId,
      },
    });
  }

  async getOrCreateSession(reportId, patientId) {
    let session = await this.findSession(reportId, patientId);
    if (!session) {
      session = await prisma.chatSession.upsert({
        where: {
          patient_id_report_id: {
            patient_id: patientId,
            report_id: reportId,
          },
        },
        update: {},
        create: {
          report_id: reportId,
          patient_id: patientId,
        },
      });
    }
    return session;
  }

  async addMessage(sessionId, sender, messageText) {
    return prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        sender,
        message: messageText,
      },
    });
  }

  async getMessages(sessionId) {
    return prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "asc" },
    });
  }
}

module.exports = new ChatRepository();
