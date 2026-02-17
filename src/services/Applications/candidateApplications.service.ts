import { eq, desc, and, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import { 
  candidateApplications, 
  candidates, // Imported candidates table
  users,      // Imported users table to fetch full name
  TselectCandidateApplication, 
  TinsertCandidateApplication 
} from "../../drizzle/schema";
import { checkCandidateEligibilityService } from "../users/users.service";


// Get applications for the logged-in student
export const getMyApplicationsService = async (userId: string) => {
  return await db.query.candidateApplications.findMany({
    where: (apps, { eq }) => eq(apps.userId, userId),

    with: {
      election: true,
      position: true,
    },

    orderBy: (apps, { desc }) => [desc(apps.createdAt)],
  });
};



// ---------------------------------------------------------
// 1. CREATE (Submit Application)
// ---------------------------------------------------------

/**
 * Submit a new application using the TinsertCandidateApplication type
 */
export const createApplicationService = async (
  data: TinsertCandidateApplication, 
  requiredPoints: number
) => {
  // Check if student meets the Scrutiny requirements
  const eligibility = await checkCandidateEligibilityService(data.userId, requiredPoints);
  if (!eligibility.eligible) throw new Error(eligibility.reason);

  const [newApp] = await db.insert(candidateApplications)
    .values(data)
    .returning();

  return await db.query.candidateApplications.findFirst({
    where: eq(candidateApplications.id, newApp.id),
    with: {
      user: { columns: { fullName: true, studentRegNo: true } },
      position: true,
      election: true
    }
  });
};

// ---------------------------------------------------------
// 2. READ (Fetch & View)
// ---------------------------------------------------------

/**
 * Get all applications for a specific election
 */
export const getElectionApplicationsService = async (electionId: string) => {
  return await db.query.candidateApplications.findMany({
    where: eq(candidateApplications.electionId, electionId),
    with: {
      user: { 
        columns: { fullName: true, studentRegNo: true, participationPoints: true } 
      },
      position: true
    },
    orderBy: [desc(candidateApplications.createdAt)]
  });
};

/**
 * Get detailed view of a single application by ID
 */
export const getApplicationByIdService = async (id: string) => {
  return await db.query.candidateApplications.findFirst({
    where: eq(candidateApplications.id, id),
    with: {
      user: true,
      election: true,
      position: true,
      reviewer: { columns: { fullName: true } }
    }
  });
};

// ---------------------------------------------------------
// 3. UPDATE (Review & Edits)
// ---------------------------------------------------------

/**
 * Update Status (Admin Scrutiny Action)
 * Includes automatic promotion to candidates table on 'approved' status
 * and automatic deletion from candidates table if status changes from approved to something else.
 */
export const reviewApplicationService = async (
  applicationId: string,
  adminId: string,
  status: TselectCandidateApplication['status'],
  remarks: string
) => {
  return await db.transaction(async (tx) => {
    // 1. Update the application status
    const [updatedApp] = await tx.update(candidateApplications)
      .set({
        status,
        adminRemarks: remarks,
        reviewedBy: adminId,
        reviewedAt: new Date()
      })
      .where(eq(candidateApplications.id, applicationId))
      .returning();

    // 2. Promotion / Demotion Logic
    if (status === 'approved') {
      // --- AUTO-PROMOTION ---
      const userRecord = await tx.query.users.findFirst({
        where: eq(users.id, updatedApp.userId),
      });

      const existingCandidate = await tx.query.candidates.findFirst({
        where: and(
          eq(candidates.electionId, updatedApp.electionId),
          eq(candidates.userId, updatedApp.userId)
        )
      });

      if (!existingCandidate) {
        // Logic: Calculate the next ballot number for this specific position in this election
        const currentCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(candidates)
          .where(and(
            eq(candidates.electionId, updatedApp.electionId),
            eq(candidates.positionId, updatedApp.positionId)
          ));

        const nextBallotNumber = Number(currentCount[0].count) + 1;

        await tx.insert(candidates).values({
          electionId: updatedApp.electionId,
          positionId: updatedApp.positionId,
          userId: updatedApp.userId,
          applicationId: updatedApp.id,
          fullName: userRecord?.fullName || "Unknown Candidate",
          manifesto: updatedApp.manifesto,
          imageUrl: updatedApp.imageUrl,
          ballotNumber: nextBallotNumber,
        });
      }
    } else {
      // --- AUTO-DELETION ---
      // If the admin changes an approved application to 'rejected' or 'pending', 
      // the candidate is removed from the voting ballot automatically.
      await tx.delete(candidates)
        .where(eq(candidates.applicationId, applicationId));
    }

    return await getApplicationByIdService(applicationId);
  });
};

/**
 * Edit Manifesto (Partial update using the Insert type)
 */
export const updateManifestoService = async (
  id: string,
  userId: string,
  updates: Partial<TinsertCandidateApplication>
) => {
  const existing = await db.query.candidateApplications.findFirst({
    where: and(eq(candidateApplications.id, id), eq(candidateApplications.userId, userId))
  });

  if (!existing) throw new Error("Application not found.");
  if (existing.status !== 'pending') throw new Error("Cannot edit after review has started.");

  return await db.update(candidateApplications)
    .set(updates)
    .where(eq(candidateApplications.id, id))
    .returning();
};

// ---------------------------------------------------------
// 4. DELETE (Withdrawal)
// ---------------------------------------------------------

/**
 * Withdraw application (Strictly typed)
 * Also ensures removal from candidates table if it was already approved
 */
export const withdrawApplicationService = async (id: string, userId: string) => {
  return await db.transaction(async (tx) => {
    // Also delete from candidates table if application is withdrawn
    await tx.delete(candidates)
      .where(eq(candidates.applicationId, id));

    return await tx.delete(candidateApplications)
      .where(and(
        eq(candidateApplications.id, id),
        eq(candidateApplications.userId, userId)
      ))
      .returning();
  });
};