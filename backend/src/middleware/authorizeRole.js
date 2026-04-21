/**
 * Express middleware factory — restrict access to one or more roles.
 *
 * Usage:  router.get("/...", authenticateJWT, authorizeRole("PATIENT"), handler)
 *         router.get("/...", authenticateJWT, authorizeRole("DOCTOR", "ADMIN"), handler)
 *
 * @param {...string} roles  Allowed role(s) from the JWT payload.
 */
function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: `Access denied. Required role(s): ${roles.join(", ")}.`,
      });
    }
    next();
  };
}

module.exports = { authorizeRole };
