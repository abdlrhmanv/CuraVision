const rateLimit = require("express-rate-limit");

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Generic limiter for all `/api/*` traffic — keeps a single misbehaving
 * client from overwhelming the service without getting in the way of
 * normal flows. Defaults are tuned for dev; tighten in production.
 */
const globalLimiter = rateLimit({
  windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseNumber(process.env.RATE_LIMIT_MAX, 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." },
});

/**
 * Stricter limiter for unauthenticated credential endpoints.
 * Throttles brute-force attempts against `/api/auth/login` and `/register`.
 */
const authLimiter = rateLimit({
  windowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    code: "RATE_LIMITED",
    message: "Too many authentication attempts. Please try again later.",
  },
});

module.exports = { globalLimiter, authLimiter };
