const jwt = require("jsonwebtoken");

/**
 * Express middleware — verify the Bearer JWT from the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 */
function authenticateJWT(req, res, next) {
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
    req.user = payload; // { sub, role, full_name, exp, iat }
    next();
  } catch (err) {
    return res.status(401).json({
      code: "INVALID_TOKEN",
      message: "Token is invalid or has expired.",
    });
  }
}

module.exports = { authenticateJWT };
