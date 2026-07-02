const prisma = require("../config/prisma");

class NotificationService {
  /**
   * Create a new notification for a user.
   */
  static async createNotification(userId, title, message, link = null) {
    return prisma.notification.create({
      data: {
        user_id: userId,
        title,
        message,
        link,
      },
    });
  }

  /**
   * Get recent notifications for a user.
   */
  static async getNotifications(userId, limit = 50) {
    return prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(notificationId, userId) {
    // Verify ownership
    const notif = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notif || notif.user_id !== userId) {
      throw { status: 404, code: "NOT_FOUND", message: "Notification not found" };
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  static async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: { user_id: userId, read: false },
      data: { read: true },
    });
  }
}

module.exports = NotificationService;
