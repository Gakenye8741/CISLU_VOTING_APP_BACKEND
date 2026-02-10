import { z } from "zod";

/* ===============================
   1️⃣ Candidate Ballot Schema
=============================== */
export const candidateBallotSchema = z.object({
  electionId: z.string().uuid({
    message: "Election ID must be a valid UUID",
  }),
  positionId: z.string().uuid({
    message: "Position ID must be a valid UUID",
  }),
  userId: z.string().uuid({
    message: "User ID must be a valid UUID",
  }),
  applicationId: z.string().uuid({
    message: "Application ID must be a valid UUID",
  }).optional(),
  
  // Snapshot data (Must match the data from their application)
  fullName: z.string()
    .min(3, { message: "Full name is required for the ballot" })
    .max(255),
  manifesto: z.string()
    .min(10, { message: "Manifesto summary is required" }),
  imageUrl: z.string()
    .url({ message: "Candidate image must be a valid URL" })
    .optional()
    .nullable(),
    
  // Sequential numbering
  ballotNumber: z.number().int().positive({
    message: "Ballot number must be a positive integer",
  }).optional(),
});

/* ===============================
   2️⃣ Disqualification Schema
=============================== */
export const disqualificationSchema = z.object({
  reason: z.string().min(10, {
    message: "A detailed reason (min 10 chars) is required for disqualification",
  }),
});

/* ===============================
   3️⃣ Validator Function
=============================== */
export function validateCandidateBallot(data: unknown) {
  const result = candidateBallotSchema.safeParse(data);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    };
  }
  return { valid: true, data: result.data };
}