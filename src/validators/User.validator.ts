import { z } from "zod";

// Matches your DB yearEnum: ["1", "2", "3", "4"]
export const userYearEnum = z.enum(["1", "2", "3", "4"]);

// Matches your DB roleEnum: ['admin', 'member']
export const userRoleEnum = z.enum(["admin", "member"]);

export const userValidator = z.object({
  // Core Registry Data
  studentRegNo: z.string().min(5, "Registration number must be at least 5 characters"),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  yearOfStudy: userYearEnum,
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: userRoleEnum.default("member"),

  // Scrutiny & Eligibility
  participationPoints: z.number().int().min(0).optional().default(0),
  isGoodStanding: z.boolean().optional().default(true),

  // Account Security
  isActive: z.boolean().optional().default(true),
  isLocked: z.boolean().optional().default(false),
});

/**
 * Validator for User Login
 */
export const loginValidator = z.object({
  studentRegNo: z.string().min(1, "Registration number is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Validator for Updating a Profile (All fields optional)
 */
export const updateUserValidator = userValidator.partial();