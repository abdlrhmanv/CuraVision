const Redis = require("ioredis");
const logger = require("../utils/logger");

// Default to Redis database 1 for celery task results, as configured in worker.
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379/1";
const redisClient = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 100, 2000);
  }
});

redisClient.on("error", (err) => {
  logger.error({ err }, "[Redis] Client Error");
});

/**
 * Query Celery task states directly from Redis (using the celery-task-meta-<task_id> key format).
 *
 * @param {string} taskId
 * @returns {Promise<object|null>}
 */
async function getTaskStatus(taskId) {
  try {
    const rawData = await redisClient.get(`celery-task-meta-${taskId}`);
    if (!rawData) return null;
    return JSON.parse(rawData);
  } catch (err) {
    logger.error({ err }, `[Redis] Failed to get task status for ${taskId}`);
    return null;
  }
}

/**
 * Retrieve lengths of specific task queues (e.g. 'celery' list).
 *
 * @param {string} queueName
 * @returns {Promise<number>}
 */
async function getQueueLength(queueName = "celery") {
  try {
    return await redisClient.llen(queueName);
  } catch (err) {
    logger.error({ err }, `[Redis] Failed to get queue length for ${queueName}`);
    return 0;
  }
}

module.exports = {
  redisClient,
  getTaskStatus,
  getQueueLength,
};
