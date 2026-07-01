const Redis = require("ioredis");
const logger = require("./logger");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("connect", () => {
  logger.info("[Redis] Connected successfully.");
});

redis.on("error", (err) => {
  logger.error({ error: err.message }, "[Redis] Connection error.");
});

module.exports = redis;
