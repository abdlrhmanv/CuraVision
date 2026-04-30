const { randomUUID } = require("crypto");

/**
 * In-memory append-only audit log store.
 * Replaces the PostgreSQL `audit_logs` table.
 *
 * A maximum size is enforced so the process does not grow unbounded
 * during long local runs.
 */

const MAX_LOGS = 5000;

/** @type {object[]} */
const LOGS = [];

function append({ user_id, action, entity_type = null, entity_id = null, metadata = null }) {
  const entry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    user_id: user_id ?? null,
    action,
    entity_type,
    entity_id,
    metadata,
  };
  LOGS.push(entry);
  if (LOGS.length > MAX_LOGS) {
    LOGS.splice(0, LOGS.length - MAX_LOGS);
  }
  return entry;
}

/**
 * Query audit logs with optional filters.
 *
 * @param {object} opts
 * @param {string} [opts.user_id]
 * @param {string} [opts.action]
 * @param {string} [opts.entity_type]
 * @param {string} [opts.entity_id]
 * @param {string} [opts.from]   ISO datetime inclusive
 * @param {string} [opts.to]     ISO datetime exclusive
 * @param {number} [opts.limit]  default 100
 * @param {number} [opts.offset] default 0
 */
function query(opts = {}) {
  const {
    user_id,
    action,
    entity_type,
    entity_id,
    from,
    to,
    limit = 100,
    offset = 0,
  } = opts;

  let results = LOGS.slice().reverse();

  if (user_id) results = results.filter((l) => l.user_id === user_id);
  if (action) results = results.filter((l) => l.action === action);
  if (entity_type) results = results.filter((l) => l.entity_type === entity_type);
  if (entity_id) results = results.filter((l) => l.entity_id === entity_id);
  if (from) {
    const fromDate = new Date(from);
    results = results.filter((l) => new Date(l.timestamp) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    results = results.filter((l) => new Date(l.timestamp) < toDate);
  }

  const total = results.length;
  const page = results.slice(offset, offset + limit);
  return { total, limit, offset, logs: page };
}

module.exports = { LOGS, append, query };
