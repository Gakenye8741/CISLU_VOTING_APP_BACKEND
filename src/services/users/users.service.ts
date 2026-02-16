import { eq, sql, and, desc, gt } from "drizzle-orm";
import db from "../../drizzle/db";
import { users, TselectUser, TinsertUser } from "../../drizzle/schema";
import crypto from "crypto";
import bcrypt from "bcrypt"; // Ensure bcrypt is installed for password hashing

// ---------------------------------------------------------
// 1. CORE CRUD OPERATIONS
// ---------------------------------------------------------

export const getUserByIdService = async (id: string): Promise<TselectUser | null> => {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
};

export const getUserByRegNoService = async (regNo: string): Promise<TselectUser | null> => {
  const [user] = await db.select().from(users).where(eq(users.studentRegNo, regNo));
  return user ?? null;
};

/**
 * Update User Profile (User Self-Service)
 * Allows users to update their personal information (excluding password).
 */
export const updateUserProfileService = async (id: string, data: Partial<TinsertUser>): Promise<TselectUser | null> => {
  const { fullName, email, yearOfStudy } = data;
  
  const [updated] = await db.update(users)
    .set({ 
      fullName, 
      email, 
      yearOfStudy 
    })
    .where(eq(users.id, id))
    .returning();
    
  return updated ?? null;
};

/**
 * Admin Update User Details
 * Full override capability including password updates.
 */
export const adminUpdateUserService = async (id: string, data: Partial<TinsertUser>): Promise<TselectUser | null> => {
  const updateData: any = {
    fullName: data.fullName,
    email: data.email,
    yearOfStudy: data.yearOfStudy,
    studentRegNo: data.studentRegNo,
  };

  // Only hash and update password if provided by admin
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const [updated] = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning();

  return updated ?? null;
};

/**
 * Delete User Account
 * Can be used by both User (self) and Admin.
 */
export const deleteUserService = async (id: string) => {
  return await db.delete(users)
    .where(eq(users.id, id))
    .returning({ deletedId: users.id });
};

// ---------------------------------------------------------
// 2. SECURITY & LOGIN LOGIC
// ---------------------------------------------------------

/**
 * Handle Failed Login Attempts
 * Updates count and sets isLocked to true exactly at 3 attempts.
 */
export const incrementFailedLoginService = async (regNo: string) => {
  return await db.update(users)
    .set({
      failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
      // Logic: If current + 1 is 3 or more, lock it.
      isLocked: sql`CASE WHEN ${users.failedLoginAttempts} + 1 >= 3 THEN true ELSE false END`
    })
    .where(eq(users.studentRegNo, regNo));
};

/**
 * Success Login Reset
 * Clears failed attempts and explicitly sets isLocked to false.
 */
export const recordSuccessfulLoginService = async (id: string) => {
  return await db.update(users)
    .set({
      failedLoginAttempts: 0,
      isLocked: false, 
      lastLoginAt: new Date(),
    })
    .where(eq(users.id, id));
};

// ---------------------------------------------------------
// 3. ACCOUNT UNLOCKING (EMAIL FLOW)
// ---------------------------------------------------------

/**
 * Generate and save a 6-digit unlock code
 */
export const generateUnlockCodeService = async (email: string) => {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Min expiry

  await db.update(users)
    .set({
      unlockCode: code,
      unlockCodeExpiresAt: expiresAt
    })
    .where(eq(users.email, email));

  return code;
};

/**
 * Verify code and reset security fields
 * This is the primary way isLocked becomes false after a lockout.
 */
export const verifyUnlockCodeService = async (email: string, code: string) => {
  const [user] = await db.select()
    .from(users)
    .where(
      and(
        eq(users.email, email),
        eq(users.unlockCode, code),
        gt(users.unlockCodeExpiresAt, new Date())
      )
    );

  if (!user) return { success: false, message: "Invalid or expired code" };

  await db.update(users)
    .set({
      failedLoginAttempts: 0,
      isLocked: false, // The account is now open
      unlockCode: null,
      unlockCodeExpiresAt: null
    })
    .where(eq(users.id, user.id));

  return { success: true, message: "Account unlocked successfully" };
};

/**
 * Resend with 60-second cooldown
 */
export const resendUnlockCodeService = async (email: string) => {
  const [user] = await db.select({
    expiresAt: users.unlockCodeExpiresAt
  })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

  if (user?.expiresAt) {
    const now = new Date();
    const existingExpiry = new Date(user.expiresAt);
    const timeSent = existingExpiry.getTime() - (15 * 60 * 1000);
    const secondsElapsed = (now.getTime() - timeSent) / 1000;

    if (secondsElapsed < 60) {
      throw new Error(`Please wait ${Math.ceil(60 - secondsElapsed)} seconds before requesting a new code.`);
    }
  }

  return await generateUnlockCodeService(email);
};

// ---------------------------------------------------------
// 4. ELIGIBILITY & MANAGEMENT
// ---------------------------------------------------------

export const checkCandidateEligibilityService = async (userId: string, requiredPoints: number) => {
  const user = await getUserByIdService(userId);
  if (!user) return { eligible: false, reason: "User not found" };
  if (!user.isActive) return { eligible: false, reason: "Account is inactive" };
  if (!user.isGoodStanding) return { eligible: false, reason: "Not in good standing" };
  
  const points = user.participationPoints ?? 0;
  if (points < requiredPoints) {
    return { eligible: false, reason: `Insufficient points. Need ${requiredPoints}, have ${points}` };
  }
  return { eligible: true };
};

export const updateParticipationPointsService = async (userId: string, points: number) => {
  return await db.update(users)
    .set({ participationPoints: sql`${users.participationPoints} + ${points}` })
    .where(eq(users.id, userId))
    .returning();
};

export const getAllUsersService = async (limit: number = 20, offset: number = 0) => {
  return await db.query.users.findMany({
    limit,
    offset,
    orderBy: [desc(users.createdAt)],
  });
};

export const updateUserStatusService = async (id: string, active: boolean, standing: boolean) => {
  const [updated] = await db.update(users)
    .set({ isActive: active, isGoodStanding: standing })
    .where(eq(users.id, id))
    .returning();
  return updated;
};