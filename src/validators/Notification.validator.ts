import { z } from "zod";

export const createNotificationSchema = z.object({
  title: z.string(),
  message: z.string(),
  type: z.enum(["SYSTEM", "ANNOUNCEMENT", "ELECTION", "REMINDER", "WARNING"]).optional(),
  user_id: z.string().uuid().optional(), // optional for broadcasts
  election_id: z.string().uuid().optional(),
  candidate_id: z.string().uuid().optional(),
  position_id: z.string().uuid().optional(),
  is_read: z.boolean().optional(),
});

export const updateNotificationSchema = z.object({
  is_read: z.boolean(),
});
