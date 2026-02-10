import db from "../../drizzle/db";
import { desc, eq, isNull, or } from "drizzle-orm";
import {
  notifications,
  NotificationInsert,
  NotificationSelect,
  notificationTypeEnum,
  users,
} from "../../drizzle/schema";

// Enum Type
export type NotificationType = typeof notificationTypeEnum.enumValues[number];

/**
 * Create a notification (single user)
 */
export const createNotificationService = async (
  data: NotificationInsert
): Promise<NotificationSelect> => {
  const [created] = await db.insert(notifications).values(data).returning();
  return created;
};

/**
 * Send notification to **many users**
 */
export const sendBulkNotificationsService = async (
  userIds: string[],
  payload: Omit<NotificationInsert, "user_id">
): Promise<number> => {
  if (userIds.length === 0) return 0;

  await db.insert(notifications).values(
    userIds.map((id) => ({
      ...payload,
      user_id: id,
    }))
  );

  return userIds.length;
};

/**
 * Send notification to **all users in the system**
 */
export const sendNotificationToAllUsersService = async (
  payload: Omit<NotificationInsert, "user_id">
): Promise<number> => {
  const allUsers = await db.query.users.findMany({
    columns: { id: true },
  });

  const userIds = allUsers.map((u) => u.id);

  return sendBulkNotificationsService(userIds, payload);
};

/**
 * Get all notifications (for admin)
 */
export const getAllNotificationsService = async (): Promise<NotificationSelect[]> => {
  return db.query.notifications.findMany({
    orderBy: [desc(notifications.created_at)],
  });
};

// Get notifications for a specific user **including broadcasts**
export const getNotificationsForUserService = async (
  userId: string
): Promise<NotificationSelect[]> => {
  return db.query.notifications.findMany({
    where: or(eq(notifications.user_id, userId), isNull(notifications.user_id)),
    orderBy: [desc(notifications.created_at)],
  });
};

/**
 * Mark single notification as read
 */
export const markNotificationAsReadService = async (
  notificationId: string
): Promise<string> => {
  await db
    .update(notifications)
    .set({ is_read: true })
    .where(eq(notifications.id, notificationId));

  return "Notification marked as read";
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsReadService = async (
  userId: string
): Promise<string> => {
  await db
    .update(notifications)
    .set({ is_read: true })
    .where(eq(notifications.user_id, userId));

  return "All notifications marked as read";
};

/**
 * Delete a single notification
 */
export const deleteNotificationService = async (
  id: string
): Promise<string> => {
  await db.delete(notifications).where(eq(notifications.id, id));
  return "Notification deleted";
};

/**
 * Delete all notifications for a user
 */
export const deleteAllNotificationsForUserService = async (
  userId: string
): Promise<string> => {
  await db.delete(notifications).where(eq(notifications.user_id, userId));
  return "All notifications deleted for user";
};
