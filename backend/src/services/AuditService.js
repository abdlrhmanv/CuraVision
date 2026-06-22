const prisma = require("../config/prisma");

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
async function log(event) {
  try {
    return await prisma.auditLog.create({
      data: {
        user_id: event.user_id || null,
        action: event.action,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        metadata: event.metadata ? event.metadata : undefined,
      },
    });
  } catch (err) {
    console.error("[AuditService] Failed to record audit log:", err.message);
  }
}

async function search(filters) {
  const where = {};
  if (filters.user_id) where.user_id = filters.user_id;
  if (filters.action) where.action = filters.action;
  if (filters.entity_type) where.entity_type = filters.entity_type;
  if (filters.entity_id) where.entity_id = filters.entity_id;
  
  if (filters.from || filters.to) {
    where.timestamp = {};
    if (filters.from) where.timestamp.gte = new Date(filters.from);
    if (filters.to) where.timestamp.lte = new Date(filters.to);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    total,
    limit,
    offset,
  };
}

module.exports = { log, search };

