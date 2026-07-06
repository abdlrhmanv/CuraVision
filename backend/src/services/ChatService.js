const { fastapiClient } = require("../integrations/fastapiClient");
const ReportService = require("./ReportService");
const ChatRepository = require("../repositories/ChatRepository");
const logger = require("../utils/logger");
const { notFound, forbidden } = require("../utils/AppError");
const crypto = require("crypto");
const redis = require("../utils/redis");

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
    throw notFound("Report not found.", "REPORT_NOT_FOUND");
  }
  if (report.patient_id !== patientId) {
    throw forbidden("You do not have access to this report.");
  }
  if (!report.patient_visible) {
    throw forbidden("This report has not been published yet.", "REPORT_NOT_PUBLISHED");
  }

  // 2. Get or create the chat session
  const session = await ChatRepository.getOrCreateSession(reportId, patientId);

  // 3. Build the chat history for the AI service (exclude current question)
  const msgs = await ChatRepository.getMessages(session.id);
  const history = toAiHistory(msgs);

  // 4. Call the FastAPI AI microservice or use cache
  let aiResponse;
  
  const cacheKey = `chat_cache:${reportId}:${patientId}:${crypto
    .createHash("sha256")
    .update(message.trim().toLowerCase())
    .digest("hex")}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      aiResponse = JSON.parse(cached);
    } else {
      const { data } = await fastapiClient.post("/ai/chatbot", {
        report_text: report.final_report,
        patient_question: message,
        chat_history: history,
      });
      aiResponse = data;
      // Cache for 24 hours (86400 seconds)
      await redis.set(cacheKey, JSON.stringify(aiResponse), "EX", 86400);
    }
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
    throw notFound("Report not found.", "REPORT_NOT_FOUND");
  }
  if (report.patient_id !== patientId) {
    throw forbidden("You do not have access to this report.");
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
