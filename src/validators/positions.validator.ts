import { z } from "zod";

// MUST match your Drizzle yearEnum: ["1", "2", "3", "4", "Alumni"]
export const yearEnum = z.enum(["1", "2", "3", "4"]);

// -------------------------------
// Create / Update Position Validator
// -------------------------------
export const positionValidator = z.object({
  electionId: z.string().uuid("electionId must be a valid UUID"),
  
  title: z
    .string()
    .min(3, "Position title must be at least 3 characters")
    .max(100),

  minParticipationPoints: z
    .number()
    .int()
    .min(0)
    .default(0),

  slotsAvailable: z
    .number()
    .int()
    .min(1)
    .default(1),

  // This will now match the database array type
  targetYears: z
    .array(yearEnum)
    .optional()
    .default([]),
});

export const updatePositionValidator = positionValidator.partial();