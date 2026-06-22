const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class AuthService {
  static signToken(user) {
    return jwt.sign(
      { sub: user.id, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
  }

  static async register({ email, password, full_name, role = "PATIENT" }) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const err = new Error("Email already in use");
      err.status = 409;
      err.code = "EMAIL_IN_USE";
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        full_name,
        role,
      },
    });

    return user;
  }

  static async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const err = new Error("Email or password is incorrect.");
      err.status = 401;
      err.code = "INVALID_CREDENTIALS";
      throw err;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      const err = new Error("Email or password is incorrect.");
      err.status = 401;
      err.code = "INVALID_CREDENTIALS";
      throw err;
    }

    if (user.status !== "ACTIVE") {
      const err = new Error("This account is not active.");
      err.status = 403;
      err.code = "ACCOUNT_DISABLED";
      throw err;
    }

    return user;
  }
}

module.exports = AuthService;
