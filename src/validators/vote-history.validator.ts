import { z } from "zod";

/**
 * 1. Participation Record Schema
 * This validates the incoming request when a user attempts to cast a vote.
 */
export const recordParticipationSchema = z.object({
  // The ID of the student/member voting
  userId: z.string().uuid({
    message: "A valid User UUID is required for the audit trail.",
  }),

  // The specific election they are participating in
  electionId: z.string().uuid({
    message: "A valid Election UUID is required.",
  }),

  // Metadata for security audits
  ipAddress: z.string()
    .ip({ version: "v4", message: "Invalid IPv4 address format" })
    .or(z.string().ip({ version: "v6", message: "Invalid IPv6 address format" }))
    .optional(),

  userAgent: z.string()
    .max(500, { message: "User agent string is too long" })
    .optional(),
});

/**
 * 2. Status Check Schema
 * Used for simple GET requests to check if a user has already voted.
 */
export const voterStatusSchema = z.object({
  userId: z.string().uuid(),
  electionId: z.string().uuid(),
});

/**
 * 3. Validator Function
 * A helper to parse and return typed data or standardized errors.
 */
export function validateVoterParticipation(data: unknown) {
  const result = recordParticipationSchema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    };
  }
  
  return { success: true, data: result.data };
}