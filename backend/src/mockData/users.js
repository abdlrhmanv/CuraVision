const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

/**
 * Mock users — replaces the PostgreSQL `users`, `patients`, and `doctors` tables.
 *
 * Passwords are pre-hashed with bcrypt so login works without a real DB.
 *
 * Plain-text credentials for testing:
 *   patient1@curavision.com  /  Patient@123
 *   patient2@curavision.com  /  Patient@456
 *   doctor@curavision.com    /  Doctor@123
 *   admin@curavision.com     /  Admin@123
 */

const USERS = [
  {
    id: "patient-001",
    email: "patient1@curavision.com",
    password_hash: bcrypt.hashSync("Patient@123", 10),
    role: "PATIENT",
    full_name: "Sara Hassan",
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "patient-002",
    email: "patient2@curavision.com",
    password_hash: bcrypt.hashSync("Patient@456", 10),
    role: "PATIENT",
    full_name: "Omar Nasser",
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "doctor-001",
    email: "doctor@curavision.com",
    password_hash: bcrypt.hashSync("Doctor@123", 10),
    role: "DOCTOR",
    full_name: "Dr. Ahmed Khalil",
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "patient-disabled-001",
    email: "disabled@curavision.com",
    password_hash: bcrypt.hashSync("Disabled@123", 10),
    role: "PATIENT",
    full_name: "Disabled Test User",
    status: "DISABLED",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "admin-001",
    email: "admin@curavision.com",
    password_hash: bcrypt.hashSync("Admin@123", 10),
    role: "ADMIN",
    full_name: "System Administrator",
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function findUserByEmail(email) {
  return (
    USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}

function findUserById(id) {
  return USERS.find((u) => u.id === id) ?? null;
}

function createUser({ email, password, role, full_name }) {
  if (findUserByEmail(email)) {
    const err = new Error("Email is already registered.");
    err.status = 409;
    err.code = "EMAIL_TAKEN";
    throw err;
  }

  const now = new Date().toISOString();
  const user = {
    id: randomUUID(),
    email,
    password_hash: bcrypt.hashSync(password, 10),
    role,
    full_name,
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
  };
  USERS.push(user);
  return user;
}

function updateUser(id, patch) {
  const user = findUserById(id);
  if (!user) return null;
  const allowed = ["role", "status", "full_name"];
  for (const key of allowed) {
    if (patch[key] !== undefined) user[key] = patch[key];
  }
  user.updated_at = new Date().toISOString();
  return user;
}

function listUsers({ query, role, status, limit = 100, offset = 0 } = {}) {
  let results = USERS.slice();
  if (role) results = results.filter((u) => u.role === role);
  if (status) results = results.filter((u) => u.status === status);
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q)
    );
  }
  const total = results.length;
  const page = results.slice(offset, offset + limit);
  return { total, limit, offset, users: page.map(toPublicUser) };
}

function toPublicUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

module.exports = {
  USERS,
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  listUsers,
  toPublicUser,
};
