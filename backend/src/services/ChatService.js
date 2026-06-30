const { fastapiClient } = require("../integrations/fastapiClient");
const ReportService = require("./ReportService");
const ChatRepository = require("../repositories/ChatRepository");
const logger = require("../utils/logger");

function toAiHistory(msgs) {
  return msgs.map((m) => ({
    role: m.sender === "PATIENT" ? "user" : "assistant",
    content: m.message,
  }));
}

/**
 * Send a patient message to the AI microservice and persist both sides
 * of the conversation in the in-memory store.
 *
 * @param {string} reportId   - The report the chatbot is scoped to.
 * @param {string} patientId  - The authenticated patient's user ID.
 * @param {string} message    - The patient's question.
 * @returns {Promise<{ session_id: string, reply: string, sources: string[] }>}
 */
async function sendMessage(reportId, patientId, message) {
  // 1. Verify the report exists and belongs to this patient
  const report = await ReportService.getReportById(reportId);
  if (!report) {
    const err = new Error("Report not found.");
    err.status = 404;
    err.code = "REPORT_NOT_FOUND";
    throw err;
  }
  if (report.patient_id !== patientId) {
    const err = new Error("You do not have access to this report.");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }
  if (!report.patient_visible) {
    const err = new Error("This report has not been published yet.");
    err.status = 403;
    err.code = "REPORT_NOT_PUBLISHED";
    throw err;
  }

  // 2. Get or create the chat session
  const session = await ChatRepository.getOrCreateSession(reportId, patientId);

  // 3. Build the chat history for the AI service (exclude current question)
  const msgs = await ChatRepository.getMessages(session.id);
  const history = toAiHistory(msgs);

  // 4. Call the FastAPI AI microservice
  let aiResponse;
  try {
    const { data } = await fastapiClient.post("/ai/chatbot", {
      report_text: report.final_report,
      patient_question: message,
      chat_history: history,
    });
    aiResponse = data;
  } catch (axiosErr) {
    logger.warn(
      { error: axiosErr.message },
      `[ChatService] AI service unreachable, falling back to local stub chatbot`
    );
    aiResponse = {
      answer: "CuraVision Assistant stub response: I see your question. For professional medical advice, please consult your doctor.",
      sources: ["Medical Glossary: fallback-stub"]
    };
  }

  // 5. Persist both turns
  await ChatRepository.addMessage(session.id, "PATIENT", message);
  await ChatRepository.addMessage(session.id, "BOT", aiResponse.answer);

  return {
    session_id: session.id,
    reply: aiResponse.answer,
    sources: aiResponse.sources ?? [],
  };
}

/**
 * Return the full conversation history for a report/patient pair.
 *
 * @param {string} reportId
 * @param {string} patientId
 * @returns {{ session_id: string|null, messages: object[] }}
 */
async function getHistory(reportId, patientId) {
  const report = await ReportService.getReportById(reportId);
  if (!report) {
    const err = new Error("Report not found.");
    err.status = 404;
    err.code = "REPORT_NOT_FOUND";
    throw err;
  }
  if (report.patient_id !== patientId) {
    const err = new Error("You do not have access to this report.");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }

  const session = await ChatRepository.getOrCreateSession(reportId, patientId);
  const msgs = await ChatRepository.getMessages(session.id);

  return {
    session_id: session.id,
    messages: msgs.map(({ id, sender, message, created_at }) => ({
      id,
      sender,
      message,
      created_at,
    })),
  };
}

module.exports = { sendMessage, getHistory };
