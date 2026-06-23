require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const logger = require("./utils/logger");

// Validate critical environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === "" || process.env.JWT_SECRET === "change-me-in-prod" || process.env.JWT_SECRET === "curavision_dev_secret_change_in_production") {
  logger.error("FATAL ERROR: JWT_SECRET environment variable is missing, empty, or insecure!");
  process.exit(1);
}

const { auditLogger } = require("./middleware/auditLogger");
const { globalLimiter, authLimiter } = require("./middleware/rateLimit");
const { getStorageRoot, isS3Enabled, getObjectStream } = require("./integrations/storageClient");

const authRoutes = require("./routes/auth.routes");
const chatRoutes = require("./routes/chat.routes");
const scansRoutes = require("./routes/scans.routes");
const reportsRoutes = require("./routes/reports.routes");
const reservationsRoutes = require("./routes/reservations.routes");
const doctorsRoutes = require("./routes/doctors.routes");
const patientsRoutes = require("./routes/patients.routes");
const adminRoutes = require("./routes/admin.routes");
const internalRoutes = require("./routes/internal.routes");

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS allowlist ────────────────────────────────────────────────────────────
// Comma-separated list of origins, e.g. "http://localhost:3000,https://curavision.app"
// Set to "*" explicitly to allow any origin (dev only).
const rawOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000").trim();
const allowAllOrigins = rawOrigins === "*";
const allowedOrigins = allowAllOrigins
  ? null
  : new Set(rawOrigins.split(",").map((o) => o.trim()).filter(Boolean));

const corsOptions = {
  origin(origin, callback) {
    // Server-to-server / curl requests have no Origin header.
    if (!origin) return callback(null, true);
    if (allowAllOrigins || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(auditLogger);

// Serve uploaded DICOMs + derived assets.
// If S3/MinIO is enabled, retrieve them from the bucket. Fallback to local files.
app.use(
  "/storage",
  async (req, res, next) => {
    if (isS3Enabled()) {
      try {
        const logicalPath = `storage${req.path}`;
        const stream = await getObjectStream(logicalPath);
        if (stream) {
          if (req.path.endsWith(".png")) {
            res.setHeader("Content-Type", "image/png");
          } else if (req.path.endsWith(".nii.gz")) {
            res.setHeader("Content-Type", "application/gzip");
          } else if (req.path.endsWith(".dcm")) {
            res.setHeader("Content-Type", "application/dicom");
          }
          res.setHeader("Cache-Control", "public, max-age=3600");
          return stream.pipe(res);
        }
      } catch (err) {
        logger.error({ err }, "[Server] Failed to stream from S3");
      }
    }
    next();
  },
  express.static(getStorageRoot(), {
    fallthrough: false,
    maxAge: "1h",
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
// Auth endpoints get a stricter limiter to slow brute-force attempts.
app.use("/api/auth", authLimiter, authRoutes);
// All other /api/* traffic gets the generic limiter.
app.use("/api", globalLimiter);
app.use("/api/chat", chatRoutes);
app.use("/api/scans", scansRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/patient", patientsRoutes); // SDD alias for patient-scoped views
app.use("/api/admin", adminRoutes);
app.use("/api/internal", internalRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "CuraVision Backend" });
});

// ── Catch-all 404 ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "Route not found." });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "An unexpected error occurred.";

  if (status >= 500) {
    logger.error({ err }, `Unexpected server error: ${message}`);
  }

  res.status(status).json({ code, message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`CuraVision Backend running on http://localhost:${PORT}`);
    logger.info(`  AI Service URL: ${process.env.AI_SERVICE_URL || "http://localhost:8001"}`);
  });
}

module.exports = app;
