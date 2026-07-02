const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { conflict } = require("../utils/AppError");

class UserService {
  static toPublicUser(user) {
    if (!user) return null;
    const { password_hash, ...publicUser } = user;
    return publicUser;
  }

  static async listUsers({ query, role, status, limit, offset }) {
    const where = {};
    if (query) {
      where.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { full_name: { contains: query, mode: "insensitive" } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit || 50,
        skip: offset || 0,
        orderBy: { created_at: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map(this.toPublicUser),
      total,
      limit: limit || 50,
      offset: offset || 0,
    };
  }

  static async findUserById(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    return this.toPublicUser(user);
  }

  static async updateUser(id, data) {
    const user = await prisma.user.update({
      where: { id },
      data,
    });
    return this.toPublicUser(user);
  }

  static async createUserByAdmin({ email, password, full_name, role }) {
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
        status: "ACTIVE",
        email_verified: true,
      },
    });

    return this.toPublicUser(user);
  }
}

module.exports = UserService;
