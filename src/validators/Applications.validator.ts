import { z } from "zod";

/* ===============================
   1️⃣ Define Enums (Align with Schema)
=============================== */
export enum ApplicationStatus {
  Pending = "pending",
  UnderReview = "under_review",
  Approved = "approved",
  Rejected = "rejected",
}

/* ===============================
   2️⃣ Zod Schema for Candidate Application
=============================== */
export const candidateApplicationSchema = z.object({
  userId: z.string().uuid({
    message: "Invalid User ID format",
  }),
  electionId: z.string().uuid({
    message: "Invalid Election ID format",
  }),
  positionId: z.string().uuid({
    message: "Invalid Position ID format",
  }),
  statementOfIntent: z.string().min(20, {
    message: "Statement of intent must be at least 20 characters",
  }),
  manifesto: z.string().min(50, {
    message: "Manifesto must be detailed (at least 10 characters)",
  }),
  imageUrl: z.string().url({ message: "Invalid image URL" }).optional(),
});

/**
 * Schema for Admin Review (Scrutiny)
 */
export const reviewApplicationSchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
  adminRemarks: z.string().min(5, {
    message: "Please provide detailed remarks for the candidate",
  }),
});

/* ===============================
   3️⃣ Validator Function
=============================== */
export function validateCandidateApplication(data: unknown) {
  const result = candidateApplicationSchema.safeParse(data);
  
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