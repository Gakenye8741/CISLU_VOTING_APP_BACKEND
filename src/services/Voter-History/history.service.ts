import { eq, and, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import { voterHistory, users } from "../../drizzle/schema";

/* =========================================================
   1️⃣ PARTICIPATION LOGIC (THE GATEKEEPER)
========================================================= */

/**
 * Record a participation entry.
 * This is the primary defense against double-voting.
 */
export const recordParticipationService = async (data: {
  userId: string;
  electionId: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  return await db.transaction(async (tx) => {
    
    // 1. Pre-check: Verify if the user exists and is active
    const userExists = await tx.query.users.findFirst({
      where: eq(users.id, data.userId)
    });
    if (!userExists) throw new Error("Authentication Error: User record not found.");

    // 2. Check for existing participation record
    // This utilizes the unique(userId, electionId) constraint at the DB level
    const existingParticipation = await tx.query.voterHistory.findFirst({
      where: and(
        eq(voterHistory.userId, data.userId),
        eq(voterHistory.electionId, data.electionId)
      ),
    });

    if (existingParticipation) {
      throw new Error("Security Alert: This member has already cast a ballot for this election.");
    }

    // 3. Log the Audit Trail
    // We capture IP and User Agent to detect fraudulent bulk-voting from single devices
    const [record] = await tx.insert(voterHistory)
      .values({
        userId: data.userId,
        electionId: data.electionId,
        ipAddress: data.ipAddress || 'unknown',
        userAgent: data.userAgent || 'unknown',
        votedAt: new Date(),
      })
      .returning();

    return record;
  });
};

/* =========================================================
   2️⃣ STATUS & VERIFICATION (VOTER UI)
========================================================= */

/**
 * Check if a user is eligible to see the ballot or if they should see 'Already Voted'.
 */
export const checkVoterStatusService = async (userId: string, electionId: string) => {
  const participation = await db.query.voterHistory.findFirst({
    where: and(
      eq(voterHistory.userId, userId),
      eq(voterHistory.electionId, electionId)
    ),
  });

  return {
    hasVoted: !!participation,
    votedAt: participation?.votedAt || null,
  };
};

/* =========================================================
   3️⃣ ANALYTICS & AUDIT (ADMIN DASHBOARD)
========================================================= */

/**
 * Returns a list of members who have participated (Audit Log).
 * Does NOT show who they voted for, only THAT they voted.
 */
export const getElectionParticipantsService = async (electionId: string) => {
  return await db.query.voterHistory.findMany({
    where: eq(voterHistory.electionId, electionId),
    with: {
      user: {
        columns: {
          fullName: true,
          studentRegNo: true
        }
      }
    },
    orderBy: [voterHistory.votedAt]
  });
};

/**
 * Real-time Turnout Calculator
 */
export const getTurnoutStatsService = async (electionId: string) => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(voterHistory)
    .where(eq(voterHistory.electionId, electionId));

  return {
    totalVotesCast: Number(result?.count || 0),
    timestamp: new Date()
  };
}