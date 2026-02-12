import db from "../drizzle/db";
import { eq, and } from "drizzle-orm";
import { roleEnum, users, TselectUser,TinsertUser, yearEnum } from "../drizzle/schema";

// ================================
// Register a new student
// ================================
export const registerUserService = async (
  studentRegNo: string,
  email: string, // Now accepting email from controller
  password: string, // Hashed password passed from controller
  role?: typeof roleEnum.enumValues[number]
): Promise<TinsertUser> => {
  const newRole = role || "member";

  const [newUser] = await db.insert(users)
    .values({
      studentRegNo,
      password: password, // Already hashed in controller
      role: newRole,
      fullName: studentRegNo, 
      yearOfStudy: "1",       
      email: email, // Using provided email
      isActive: true,
      isGoodStanding: true,
      isLocked: false,
    })
    .returning();

  if (!newUser) throw new Error("Failed to create user");

  return newUser;
};

// ================================
// Login service
// ================================
export const loginUserService = async (
  studentRegNo: string,
  password: string // Plain password for comparison
): Promise<TselectUser> => {
  const user = await db.query.users.findFirst({
    where: eq(users.studentRegNo, studentRegNo),
  });

  if (!user) throw new Error("User not found");

  // This still needs to stay here to verify the user during login
  const bcrypt = await import("bcrypt");
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error("Invalid password");

  // Track login activity
  await db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  return user; 
};

// ================================
// Complete profile
// ================================
export const completeStudentProfileService = async (
  studentRegNo: string,
  fullName: string,
  yearOfStudy: typeof yearEnum.enumValues[number],
  email: string
): Promise<TinsertUser> => {
  const [updatedUser] = await db.update(users)
    .set({
      fullName,
      yearOfStudy,
      email,
    })
    .where(eq(users.studentRegNo, studentRegNo))
    .returning();

  if (!updatedUser) throw new Error("Failed to update profile");

  return updatedUser;
};

// ================================
// Forgot Password Service
// ================================
export const forgotPasswordService = async (
  studentRegNo: string,
  email: string
): Promise<string> => {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.studentRegNo, studentRegNo),
      eq(users.email, email)
    ),
  });

  if (!user) throw new Error("No matching user found with those credentials.");

  return "Identity verified. You may now proceed to reset your password.";
};

// ================================
// Reset Password Service
// ================================
export const resetPasswordService = async (
  studentRegNo: string,
  newPassword: string // Hashed password passed from controller
): Promise<string> => {
  const [updated] = await db.update(users)
    .set({ 
      password: newPassword, // Use hashed password
      isLocked: false,
      failedLoginAttempts: 0 
    })
    .where(eq(users.studentRegNo, studentRegNo))
    .returning();

  if (!updated) throw new Error("User not found or reset failed");

  return "Password has been reset successfully.";
};

// ================================
// Get user by registration number
// ================================
export const getUserByRegNoService = async (
  studentRegNo: string
): Promise<TselectUser | undefined> => {
  return db.query.users.findFirst({
    where: eq(users.studentRegNo, studentRegNo),
  });
};

// ================================
// Update password (Authenticated)
// ================================
export const updateUserPasswordService = async (
  studentRegNo: string,
  newPassword: string // Hashed password passed from controller
): Promise<string> => {
  const [updated] = await db.update(users)
    .set({ password: newPassword }) // Use hashed password
    .where(eq(users.studentRegNo, studentRegNo))
    .returning();

  if (!updated) throw new Error("User not found or password update failed");

  return "Password updated successfully";
};