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
        status: "DISABLED",
        email_verified: false,
      },
    });

    await sendVerificationEmail(user);

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

async function sendVerificationEmail(user) {
  const nodemailer = require("nodemailer");
  const logger = require("../utils/logger");

  const token = jwt.sign(
    { sub: user.id, purpose: "email-verification" },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  let transporter;
  const fromEmail = process.env.SMTP_FROM || '"CuraVision" <noreply@curavision.app>';

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  const verifyLink = `${backendUrl}/api/auth/verify-email?token=${token}`;

  const info = await transporter.sendMail({
    from: fromEmail,
    to: user.email,
    subject: "Verify your CuraVision email",
    text: `Hello ${user.full_name},\n\nPlease verify your email by clicking this link:\n\n${verifyLink}\n\nThis link will expire in 24 hours.`,
    html: `<p>Hello <b>${user.full_name}</b>,</p><p>Please verify your email by clicking the link below:</p><p><a href="${verifyLink}">Verify Email</a></p><p>This link will expire in 24 hours.</p>`,
  });

  if (process.env.SMTP_HOST) {
    logger.info(`Verification email sent to ${user.email} (MessageID: ${info.messageId})`);
  } else {
    logger.info("Verification email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
  }
}

async function verifyEmail(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== "email-verification") {
      throw unauthorized("Invalid verification token purpose.", "INVALID_TOKEN");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw unauthorized("User not found.", "INVALID_TOKEN");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        email_verified: true,
        status: "ACTIVE",
      },
    });

    return true;
  } catch (err) {
    throw unauthorized("Email verification token is invalid or has expired.", "INVALID_TOKEN");
  }
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
  sendVerificationEmail,
  verifyEmail,
};
