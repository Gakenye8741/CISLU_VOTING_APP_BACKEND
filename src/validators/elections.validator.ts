import { z } from "zod";

const electionStatusSchema = z.enum(["cancelled", "upcoming", "voting", "completed"]);

// 1. Define the base schema shape first
const electionBaseSchema = z.object({
  title: z.string().min(3, "Election title must be at least 3 characters"),
  description: z.string().optional(),
  startDate: z.string().datetime({ message: "startDate must be a valid ISO datetime string" }),
  endDate: z.string().datetime({ message: "endDate must be a valid ISO datetime string" }),
  status: electionStatusSchema.optional().default("upcoming"),
});

// 2. Create Validator: Base + Refinement
export const electionValidator = electionBaseSchema.refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after the start date",
  path: ["endDate"],
});

// 3. Update Validator: Partial Base + Optional Refinement
export const updateElectionValidator = electionBaseSchema.partial().refine((data) => {
  // Only compare dates if both are actually being updated
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: "End date must be after the start date",
  path: ["endDate"],
});

// -------------------------------
// Other Validators (Stay the same)
// -------------------------------
export const changeElectionStatusValidator = z.object({
  status: electionStatusSchema,
});

export const getElectionsByStatusValidator = z.object({
  status: electionStatusSchema,
});