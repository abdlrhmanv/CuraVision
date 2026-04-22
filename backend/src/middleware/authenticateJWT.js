const jwt = require("jsonwebtoken");

/**
 * Express middleware — verify the Bearer JWT from the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      code: "MISSING_TOKEN",
      message: "Authorization header with Bearer token is required.",
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

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
