const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

/** Matches scan UUIDs under /scans, /masks, or /heatmaps. */
const SCAN_ID_IN_PATH =
  /\/(?:scans|masks|heatmaps)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    cookies[parts[0].trim()] = (parts[1] || "").trim();
  });
  return cookies;
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return parseCookies(req).token || null;
}

function extractScanId(storagePath) {
  const match = storagePath.match(SCAN_ID_IN_PATH);
  return match ? match[1] : null;
}

function canAccessScan(payload, scan) {
  if (!scan) return false;
  if (payload.role === "ADMIN") return true;
  if (payload.role === "DOCTOR" && scan.doctor_id === payload.sub) return true;
  if (payload.role === "PATIENT" && scan.patient_id === payload.sub) return true;
  return false;
}

/**
 * Protects /storage medical assets (DICOM, masks, heatmaps).
 * Requires JWT via Authorization header or HttpOnly cookie.
 */
async function storageAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      code: "INVALID_TOKEN",
      message: "Invalid or expired token.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { status: true },
  });
  if (!user || user.status === "DISABLED") {
    return res.status(403).json({
      code: "ACCOUNT_DISABLED",
      message: "Account is not active.",
    });
  }

  const scanId = extractScanId(req.path);
  if (!scanId) {
    return res.status(403).json({
      code: "FORBIDDEN",
      message: "Access denied.",
    });
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    select: { id: true, doctor_id: true, patient_id: true },
  });

  if (!canAccessScan(payload, scan)) {
    return res.status(403).json({
      code: "FORBIDDEN",
      message: "You do not have access to this resource.",
    });
  }

  req.user = payload;
  return next();
}

module.exports = storageAuth;
