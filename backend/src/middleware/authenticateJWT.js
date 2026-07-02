const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

async function assertActiveUser(payload, res) {
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { status: true },
  });
  if (!user || user.status === "DISABLED") {
    res.clearCookie("token");
    res.clearCookie("refreshToken");
    res.status(403).json({
      code: "ACCOUNT_DISABLED",
      message: "This account is not active.",
    });
    return false;
  }
  return true;
}

/**
 * Express middleware — verify the Bearer JWT from the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 */
async function authenticateJWT(req, res, next) {
  let token;
  const authHeader = req.headers["authorization"];
  const cookieHeader = req.headers["cookie"];
  const cookies = {};

  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      cookies[parts[0].trim()] = (parts[1] || "").trim();
    });
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (cookies.token) {
    token = cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      code: "MISSING_TOKEN",
      message: "Authorization header with Bearer token is required.",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!(await assertActiveUser(payload, res))) return;
    req.user = payload; // { sub, role, full_name, exp, iat }
    return next();
  } catch (err) {
    const refreshToken = cookies.refreshToken;
    if (refreshToken) {
      try {
        const refreshPayload = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
        );

        // Sign a new access token
        const newAccessToken = jwt.sign(
          {
            sub: refreshPayload.sub,
            role: refreshPayload.role,
            full_name: refreshPayload.full_name,
          },
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
        );

        // Set the new access token cookie
        const isProd = process.env.NODE_ENV === "production";
        res.cookie("token", newAccessToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: isProd ? "strict" : "lax",
          maxAge: 15 * 60 * 1000, // 15m
        });

        const payload = jwt.verify(newAccessToken, process.env.JWT_SECRET);
        if (!(await assertActiveUser(payload, res))) return;
        req.user = payload;
        return next();
      } catch (refreshErr) {
        return res.status(401).json({
          code: "SESSION_EXPIRED",
          message: "Session has expired. Please log in again.",
        });
      }
    }

    return res.status(401).json({
      code: "INVALID_TOKEN",
      message: "Token is invalid or has expired.",
    });
  }
}

module.exports = { authenticateJWT };
