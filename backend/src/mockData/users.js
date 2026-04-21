const bcrypt = require("bcryptjs");

/**
 * Mock users — replaces the PostgreSQL `users`, `patients`, and `doctors` tables.
 *
 * Passwords are pre-hashed with bcrypt (cost 10) so login works without a real DB.
 *
 * Plain-text credentials for testing:
 *   patient1@curavision.com  /  Patient@123
 *   patient2@curavision.com  /  Patient@456
 *   doctor@curavision.com    /  Doctor@123
 */

const MOCK_USERS = [
  {
    id: "patient-001",
    email: "patient1@curavision.com",
    // bcrypt hash of "Patient@123"
    password_hash: bcrypt.hashSync("Patient@123", 10),
    role: "PATIENT",
    full_name: "Sara Hassan",
  },
  {
    id: "patient-002",
    email: "patient2@curavision.com",
    // bcrypt hash of "Patient@456"
    password_hash: bcrypt.hashSync("Patient@456", 10),
    role: "PATIENT",
    full_name: "Omar Nasser",
  },
  {
    id: "doctor-001",
    email: "doctor@curavision.com",
    // bcrypt hash of "Doctor@123"
    password_hash: bcrypt.hashSync("Doctor@123", 10),
    role: "DOCTOR",
    full_name: "Dr. Ahmed Khalil",
  },
];

/**
 * Find a user by email address (case-insensitive).
 * @param {string} email
 * @returns {object|null}
 */
function findUserByEmail(email) {
  return MOCK_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  ) ?? null;
}

/**
 * Find a user by their UUID.
 * @param {string} id
 * @returns {object|null}
 */
function findUserById(id) {
  return MOCK_USERS.find((u) => u.id === id) ?? null;
}

module.exports = { MOCK_USERS, findUserByEmail, findUserById };
