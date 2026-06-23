const Redis = require("ioredis");

// Default to Redis database 1 for celery task results, as configured in worker.
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379/1";
const redisClient = new Redis(redisUrl);

redisClient.on("error", (err) => {
  console.error("[Redis] Client Error:", err);
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
    console.error(`[Redis] Failed to get task status for ${taskId}:`, err);
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
    console.error(`[Redis] Failed to get queue length for ${queueName}:`, err);
    return 0;
  }
}

module.exports = {
  redisClient,
  getTaskStatus,
  getQueueLength,
};
