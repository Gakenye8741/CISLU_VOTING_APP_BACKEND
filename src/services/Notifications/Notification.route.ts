import { Router } from "express";
import {
  createNotificationController,
  sendBulkNotificationsController,
  sendNotificationToAllUsersController,
  getAllNotificationsController,
  getNotificationsForUserController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  deleteNotificationController,
  deleteAllNotificationsForUserController,
} from "./Notification.controller";

import { adminAuth, anyAuthenticatedUser } from "../../middlewares/bearAuth";

const NotificationsRouter = Router();

// -------------------------------
// Admin Routes
// -------------------------------

// Create a new notification (single user or broadcast)
NotificationsRouter.post("/create", adminAuth, createNotificationController);

// Send notification to multiple users
NotificationsRouter.post("/bulk", adminAuth, sendBulkNotificationsController);

// Broadcast notification to all users
NotificationsRouter.post("/broadcast", adminAuth, sendNotificationToAllUsersController);

// Get all notifications (Admin)
NotificationsRouter.get("/", adminAuth, getAllNotificationsController);

// Delete a single notification (Admin)
NotificationsRouter.delete("/delete/:id", adminAuth, deleteNotificationController);

// Delete all notifications for a user (Admin)
NotificationsRouter.delete("/delete-all/:userId", adminAuth, deleteAllNotificationsForUserController);

// -------------------------------
// User Routes
// -------------------------------

// Get notifications for a specific user (includes broadcasts)
NotificationsRouter.get("/user/:userId", anyAuthenticatedUser, getNotificationsForUserController);

// Mark a single notification as read
NotificationsRouter.put("/mark-read/:id", anyAuthenticatedUser, markNotificationAsReadController);

// Mark all notifications as read for a user
NotificationsRouter.put("/mark-all-read/:userId", anyAuthenticatedUser, markAllNotificationsAsReadController);

export default NotificationsRouter;
