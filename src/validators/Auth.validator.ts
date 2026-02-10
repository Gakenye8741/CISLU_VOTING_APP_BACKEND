import { z } from "zod";

/* ================================
   1. User Registration Validator
   Now requires email to send credentials
================================ */
export const allowedRoles = [
  "member",
  "admin",
] as const;

export const registerUserValidator = z.object({
  studentRegNo: z
    .string()
    .min(3, "Registration number must be at least 3 characters")
    // Updated regex to allow lowercase letters during input before transformation
    .regex(
      /^[a-zA-Z0-9\/]+$/,
      "Registration number can only contain letters, numbers, and slashes"
    )
    .trim()
    .transform((val) => val.toUpperCase()),
  
  // Email is now mandatory for registration to support mailing
  email: z.string().email("A valid email is required for registration"),
  
  password: z.string().optional(),
  
  role: z
    .enum(allowedRoles)
    .optional()
    .default("member"),
});

/* ================================
   2. User Login Validator
================================ */
export const loginUserValidator = z.object({
  studentRegNo: z
    .string()
    .min(3, "Registration number is required")
    .transform((val) => val.toUpperCase()),
  password: z.string().min(1, "Password is required"),
});

/* ================================
   3. Profile Completion Validator
================================ */
export const completeProfileValidator = z.object({
  fullName: z
    .string()
    .min(3, "Full name must be at least 3 characters")
    .trim(),
  yearOfStudy: z.enum(["1", "2", "3", "4"]),
  // Email can still be updated here if they have a preferred contact
  email: z.string().email("Invalid email address"),
});

/* ================================
   4. Forgot Password Validator
================================ */
export const forgotPasswordValidator = z.object({
  studentRegNo: z
    .string()
    .transform((val) => val.toUpperCase()),
  email: z.string().email("Invalid email"),
});

/* ================================
   5. Reset Password Validator
================================ */
export const resetPasswordValidator = z.object({
  studentRegNo: z
    .string()
    .transform((val) => val.toUpperCase()),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

/* ================================
   6. Password Update Validator
================================ */
export const updatePasswordValidator = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});