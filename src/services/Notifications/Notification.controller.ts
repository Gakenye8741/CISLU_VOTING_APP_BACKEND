import { Request, Response } from "express";
import {
  createNotificationService,
  sendBulkNotificationsService,
  sendNotificationToAllUsersService,
  getAllNotificationsService,
  getNotificationsForUserService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  deleteNotificationService,
  deleteAllNotificationsForUserService,
} from "./Notifications.service";

import { createNotificationSchema, updateNotificationSchema } from "../../validators/Notification.validator";
import { z } from "zod";

// UUID param schemas
const uuidParamSchema = z.object({ id: z.string().uuid() });
const userIdParamSchema = z.object({ userId: z.string().uuid() });

/**
 * Create a SINGLE notification
 */
export const createNotificationController = async (req: Request, res: Response) => {
  try {
    const parsedData = createNotificationSchema.parse(req.body);

    const notification = {
      title: parsedData.title,
      message: parsedData.message,
      type: parsedData.type ?? "SYSTEM",
      user_id: parsedData.user_id ?? null, // null = broadcast
      election_id: parsedData.election_id ?? null,
      candidate_id: parsedData.candidate_id ?? null,
      position_id: parsedData.position_id ?? null,
      is_read: parsedData.is_read ?? false,
      sender_id: null,
    };

    const created = await createNotificationService(notification);
    res.status(201).json({ message: "Notification created", notification: created });
  } catch (err: any) {
    if (err.name === "ZodError") return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message || "Failed to create notification" });
  }
};

/**
 * Send notification to MANY users
 */
export const sendBulkNotificationsController = async (req: Request, res: Response) => {
  try {
    const { userIds, payload } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds must be a non-empty array" });
    }

    userIds.forEach((id: string) => z.string().uuid().parse(id));
    const parsedPayload = createNotificationSchema.omit({ user_id: true }).parse(payload);

    const count = await sendBulkNotificationsService(userIds, parsedPayload);
    res.status(201).json({ message: `Sent notifications to ${count} users`, count });
  } catch (err: any) {
    if (err.name === "ZodError") return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message || "Failed to send bulk notifications" });
  }
};

/**
 * Send notification to ALL users
 */
export const sendNotificationToAllUsersController = async (req: Request, res: Response) => {
  try {
    const parsedPayload = createNotificationSchema.omit({ user_id: true }).parse(req.body);

    const count = await sendNotificationToAllUsersService(parsedPayload);
    res.status(201).json({ message: `Notification sent to all ${count} users`, count });
  } catch (err: any) {
    if (err.name === "ZodError") return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message || "Failed to broadcast notifications" });
  }
};

/**
 * Get ALL notifications (admin)
 */
export const getAllNotificationsController = async (req: Request, res: Response) => {
  try {
    const data = await getAllNotificationsService();
    res.status(200).json({ notifications: data });
  } catch (err) {
    res.status(500).json({ error: "Unable to fetch notifications" });
  }
};

/**
 * Get notifications for a SPECIFIC user (including broadcasts)
 */
export const getNotificationsForUserController = async (req: Request, res: Response) => {
  try {
    const { userId } = userIdParamSchema.parse(req.params);
    const data = await getNotificationsForUserService(userId);
    res.status(200).json({ notifications: data });
  } catch (err: any) {
    res.status(400).json({ error: err.message || err });
  }
};

/**
 * Mark ONE notification as READ
 */
export const markNotificationAsReadController = async (req: Request, res: Response) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    updateNotificationSchema.parse(req.body); // validate input

    const message = await markNotificationAsReadService(id);
    res.status(200).json({ message });
  } catch (err: any) {
    res.status(400).json({ error: err.message || err });
  }
};

/**
 * Mark ALL notifications as READ for a user
 */
export const markAllNotificationsAsReadController = async (req: Request, res: Response) => {
  try {
    const { userId } = userIdParamSchema.parse(req.params);

    const message = await markAllNotificationsAsReadService(userId);
    res.status(200).json({ message });
  } catch (err: any) {
    res.status(400).json({ error: err.message || err });
  }
};

/**
 * Delete a SINGLE notification
 */
export const deleteNotificationController = async (req: Request, res: Response) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);

    const message = await deleteNotificationService(id);
    res.status(200).json({ message });
  } catch (err: any) {
    res.status(400).json({ error: err.message || err });
  }
};

/**
 * Delete ALL notifications for a user
 */
export const deleteAllNotificationsForUserController = async (req: Request, res: Response) => {
  try {
    const { userId } = userIdParamSchema.parse(req.params);

    const message = await deleteAllNotificationsForUserService(userId);
    res.status(200).json({ message });
  } catch (err: any) {
    res.status(400).json({ error: err.message || err });
  }
};
