const { v4: uuidv4 } = require("crypto");

/**
 * In-memory store for chat sessions and messages.
 *
 * Structure:
 *   sessions  Map<sessionId, { id, patient_id, report_id, created_at }>
 *   messages  Map<sessionId, Array<{ id, session_id, sender, message, created_at }>>
 */

/** @type {Map<string, object>} */
const sessions = new Map();

/** @type {Map<string, object[]>} */
const messages = new Map();

/**
 * Generate a simple UUID using Node's built-in crypto.
 * @returns {string}
 */
function newId() {
  return require("crypto").randomUUID();
}

/**
 * Find an existing session for a given (reportId, patientId) pair.
 * @param {string} reportId
 * @param {string} patientId
 * @returns {object|null}
 */
function findSession(reportId, patientId) {
  for (const session of sessions.values()) {
    if (session.report_id === reportId && session.patient_id === patientId) {
      return session;
    }
  }
  return null;
}

/**
 * Get or create a chat session.
 * @param {string} reportId
 * @param {string} patientId
 * @returns {object} session
 */
function getOrCreateSession(reportId, patientId) {
  const existing = findSession(reportId, patientId);
  if (existing) return existing;

  const session = {
    id: newId(),
    patient_id: patientId,
    report_id: reportId,
    created_at: new Date().toISOString(),
  };
  sessions.set(session.id, session);
  messages.set(session.id, []);
  return session;
}

/**
 * Append a message to a session.
 * @param {string} sessionId
 * @param {"PATIENT"|"BOT"} sender
 * @param {string} message
 * @returns {object} the saved message object
 */
function addMessage(sessionId, sender, message) {
  if (!messages.has(sessionId)) {
    messages.set(sessionId, []);
  }
  const msg = {
    id: newId(),
    session_id: sessionId,
    sender,
    message,
    created_at: new Date().toISOString(),
  };
  messages.get(sessionId).push(msg);
  return msg;
}

/**
 * Get the full message history for a session, ordered by created_at asc.
 * @param {string} sessionId
 * @returns {object[]}
 */
function getMessages(sessionId) {
  return messages.get(sessionId) ?? [];
}

/**
 * Convert stored messages to the chat_history format expected by the AI service.
 * @param {object[]} msgs
 * @returns {Array<{role: string, content: string}>}
 */
function toAiHistory(msgs) {
  return msgs.map((m) => ({
    role: m.sender === "PATIENT" ? "user" : "assistant",
    content: m.message,
  }));
}

module.exports = {
  getOrCreateSession,
  addMessage,
  getMessages,
  toAiHistory,
};
