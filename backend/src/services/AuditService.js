const crypto = require("crypto");
const prisma = require("../config/prisma");
const logger = require("../utils/logger");
const { redisClient } = require("../integrations/redisClient");

let processTimer = null;

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
  const payload = {
    id: event.id || crypto.randomUUID(),
    user_id: event.user_id || null,
    action: event.action,
    entity_type: event.entity_type || null,
    entity_id: event.entity_id || null,
    metadata: event.metadata || null,
    timestamp: new Date().toISOString(),
  };

  try {
    await redisClient.rpush("audit_log_queue", JSON.stringify(payload));
    // Also write-through to DB so admin dashboards/tests see it immediately.
    // Use a stable ID so duplicates are safe.
    try {
      await prisma.auditLog.create({ data: payload });
    } catch (_dbErr) {
      // ignore duplicate/constraint errors
    }
  } catch (err) {
    logger.warn({ error: err.message }, "[AuditService] Redis queue failed. Falling back to sync DB insert.");
    try {
      await prisma.auditLog.create({ data: payload });
    } catch (dbErr) {
      logger.error({ err: dbErr }, "[AuditService] Synchronous DB fallback failed");
    }
  }
}

function startQueueProcessor(intervalMs = 3000, batchSize = 50) {
  if (processTimer) return;
  processTimer = setInterval(async () => {
    try {
      const pipeline = redisClient.pipeline();
      for (let i = 0; i < batchSize; i++) {
        pipeline.lpop("audit_log_queue");
      }
      const results = await pipeline.exec();

      const logsToWrite = [];
      for (const [err, val] of results) {
        if (val) {
          logsToWrite.push(JSON.parse(val));
        }
      }

      if (logsToWrite.length > 0) {
        logger.info(`[AuditService] Batch-writing ${logsToWrite.length} audit logs to database.`);
        await prisma.auditLog.createMany({
          data: logsToWrite,
          skipDuplicates: true,
        });
      }
    } catch (err) {
      logger.error({ err }, "[AuditService] Error processing audit log batch");
    }
  }, intervalMs);

  if (processTimer && typeof processTimer.unref === "function") {
    processTimer.unref();
  }
}

function stopQueueProcessor() {
  if (processTimer) {
    clearInterval(processTimer);
    processTimer = null;
  }
}

// Automatically start the processor
startQueueProcessor();

async function search(filters) {
  const where = {};
  if (filters.user_id) where.user_id = filters.user_id;
  if (filters.action) {
    // LOGIN_SUCCESS is the canonical action; legacy rows may still use LOGIN.
    if (filters.action === "LOGIN_SUCCESS") {
      where.action = { in: ["LOGIN_SUCCESS", "LOGIN"] };
    } else {
      where.action = filters.action;
    }
  }
  if (filters.entity_type) where.entity_type = filters.entity_type;
  if (filters.entity_id) where.entity_id = filters.entity_id;
  
  if (filters.from || filters.to) {
    where.timestamp = {};
    if (filters.from) where.timestamp.gte = new Date(`${filters.from}T00:00:00.000Z`);
    if (filters.to) where.timestamp.lte = new Date(`${filters.to}T23:59:59.999Z`);
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

module.exports = {
  log,
  search,
  startQueueProcessor,
  stopQueueProcessor,
};

