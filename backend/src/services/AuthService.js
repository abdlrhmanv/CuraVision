const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { conflict, unauthorized, forbidden } = require("../utils/AppError");

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, full_name: user.full_name },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
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

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null; // Statelessly handle user not found without disclosing it to avoid user enumeration

  // Reset token expires in 1 hour
  const token = jwt.sign(
    { sub: user.id, purpose: "password-reset" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return { token, user };
}

async function resetPassword(token, newPassword) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== "password-reset") {
      throw unauthorized("Invalid reset token purpose.", "INVALID_TOKEN");
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: payload.sub },
      data: { password_hash },
    });

    return true;
  } catch (err) {
    throw unauthorized("Password reset token is invalid or has expired.", "INVALID_TOKEN");
  }
}

module.exports = {
  signToken,
  signRefreshToken,
  verifyRefreshToken,
  register,
  login,
  forgotPassword,
  resetPassword,
};
