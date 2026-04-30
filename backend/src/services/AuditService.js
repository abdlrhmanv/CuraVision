const { append, query } = require("../mockData/auditLogs");

/**
 * Record a single audit event.
 *
 * Metadata MUST NOT include raw PHI (patient names, images, etc.).
 * Safe examples: status transitions, entity IDs, action outcomes.
 *
 * @param {object} event
 * @param {string|null} event.user_id
 * @param {string} event.action
 * @param {string} [event.entity_type]
 * @param {string} [event.entity_id]
 * @param {object} [event.metadata]
 */
function log(event) {
  return append(event);
}

function search(filters) {
  return query(filters);
}

module.exports = { log, search };
