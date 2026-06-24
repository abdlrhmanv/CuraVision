class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function createError(status, code, message) {
  return new AppError(status, code, message);
}

function badRequest(message, code = "BAD_REQUEST") {
  return createError(400, code, message);
}

function unauthorized(message, code = "UNAUTHORIZED") {
  return createError(401, code, message);
}

function forbidden(message, code = "FORBIDDEN") {
  return createError(403, code, message);
}

function notFound(message, code = "NOT_FOUND") {
  return createError(404, code, message);
}

function conflict(message, code = "CONFLICT") {
  return createError(409, code, message);
}

function serverError(message, code = "INTERNAL_SERVER_ERROR") {
  return createError(500, code, message);
}

module.exports = {
  AppError,
  createError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
};
