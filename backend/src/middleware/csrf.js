const crypto = require("crypto");

/**
 * Double Submit Cookie CSRF Middleware
 * 
 * 1. Ensures an `XSRF-TOKEN` cookie is set on the client.
 * 2. On state-changing requests, verifies that the `x-xsrf-token` header matches the cookie.
 */
function csrfMiddleware(req, res, next) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  // Try to parse the token from the raw cookie header
  let token = null;
  const cookieHeader = req.headers["cookie"];
  if (cookieHeader) {
    const xsrfCookie = cookieHeader.split(";").find((row) => row.trim().startsWith("XSRF-TOKEN="));
    if (xsrfCookie) {
      token = xsrfCookie.split("=")[1]?.trim();
    }
  }
  
  // If no token exists, generate one and set the readable cookie
  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("XSRF-TOKEN", token, {
      httpOnly: false, // Must be readable by client JS
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
  }

  // Safe methods bypass validation
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Validate token on mutating requests
  const headerToken = req.headers["x-xsrf-token"];
  
  if (!headerToken || headerToken !== token) {
    return res.status(403).json({
      code: "CSRF_ERROR",
      message: "Invalid or missing CSRF token",
    });
  }
  
  next();
}

module.exports = csrfMiddleware;
