const { redisClient } = require("../integrations/redisClient");
const logger = require("../utils/logger");

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const memoryCache = new Map();

function cleanMemoryCache() {
  const now = Date.now();
  for (const [key, record] of memoryCache.entries()) {
    if (now > record.resetTime) {
      memoryCache.delete(key);
    }
  }
}
// Run memory cleanup every 5 minutes to prevent memory bloat
const cleanInterval = setInterval(cleanMemoryCache, 5 * 60 * 1000);
if (cleanInterval.unref) {
  cleanInterval.unref();
}

/**
 * Distributed rate limiter powered by Redis.
 * Falls back to local in-memory rate limiting if Redis is unavailable.
 */
function createRedisLimiter({ prefix, max, windowMs, message, skipSuccessful }) {
  return async (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const key = `ratelimit:${prefix}:${ip}`;

    // Handle Redis lazy connection if client is not connected yet
    if (redisClient && redisClient.status === "wait") {
      try {
        await redisClient.connect();
      } catch (err) {
        // ignore and let it fail-back below
      }
    }

    // Fallback to local in-memory rate limiter if Redis is offline
    if (!redisClient || redisClient.status !== "ready") {
      const now = Date.now();
      let record = memoryCache.get(key);

      if (!record || now > record.resetTime) {
        record = {
          count: 1,
          resetTime: now + windowMs,
        };
        memoryCache.set(key, record);
      } else {
        record.count += 1;
      }

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));

      if (record.count > max) {
        return res.status(429).json({
          code: "RATE_LIMITED",
          message: message || "Too many requests. Please slow down.",
        });
      }

      if (skipSuccessful) {
        res.on("finish", () => {
          if (res.statusCode < 400) {
            const rec = memoryCache.get(key);
            if (rec && rec.count > 0) {
              rec.count -= 1;
            }
          }
        });
      }

      return next();
    }

    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.pexpire(key, windowMs);
      }

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));

      if (count > max) {
        return res.status(429).json({
          code: "RATE_LIMITED",
          message: message || "Too many requests. Please slow down.",
        });
      }

      // Decrement the counter if request was successful and we want to skip successful attempts
      if (skipSuccessful) {
        res.on("finish", async () => {
          if (res.statusCode < 400) {
            try {
              await redisClient.decr(key);
            } catch (err) {
              // ignore
            }
          }
        });
      }

      next();
    } catch (err) {
      logger.error({ err }, `[RateLimit] Redis operation failed for ${key}, falling back to in-memory`);
      
      // Secondary fallback inside catch block
      const now = Date.now();
      let record = memoryCache.get(key);
      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        memoryCache.set(key, record);
      } else {
        record.count += 1;
      }

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));

      if (record.count > max) {
        return res.status(429).json({
          code: "RATE_LIMITED",
          message: message || "Too many requests. Please slow down.",
        });
      }
      next();
    }
  };
}

const globalLimiter = createRedisLimiter({
  prefix: "global",
  max: parseNumber(process.env.RATE_LIMIT_MAX, 300),
  windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  message: "Too many requests. Please slow down.",
});

const authLimiter = createRedisLimiter({
  prefix: "auth",
  max: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
  windowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  skipSuccessful: true,
  message: "Too many authentication attempts. Please try again later.",
});

const chatLimiter = createRedisLimiter({
  prefix: "chat",
  max: 10,
  windowMs: 60 * 1000,
  message: "You are sending messages too quickly. Please wait a moment.",
});

module.exports = { globalLimiter, authLimiter, chatLimiter };
