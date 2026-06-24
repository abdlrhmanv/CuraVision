const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { conflict, unauthorized, forbidden } = require("../utils/AppError");

function signToken(user) {
    return jwt.sign(
      { sub: user.id, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
  }

async function register({ email, password, full_name, role = "PATIENT" }) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw conflict("Email already in use", "EMAIL_IN_USE");
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

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw unauthorized("Email or password is incorrect.", "INVALID_CREDENTIALS");
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw unauthorized("Email or password is incorrect.", "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw forbidden("This account is not active.", "ACCOUNT_DISABLED");
  }

  return user;
}

module.exports = {
  signToken,
  register,
  login,
};
