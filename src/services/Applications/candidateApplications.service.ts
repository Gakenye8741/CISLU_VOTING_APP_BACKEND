import { eq, desc, and } from "drizzle-orm";
import db from "../../drizzle/db";
import { 
  candidateApplications, 
  TselectCandidateApplication, 
  TinsertCandidateApplication 
} from "../../drizzle/schema";
import { checkCandidateEligibilityService } from "../users/users.service";


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
 */
export const reviewApplicationService = async (
  applicationId: string,
  adminId: string,
  status: TselectCandidateApplication['status'], // Uses the inferred enum type
  remarks: string
) => {
  await db.update(candidateApplications)
    .set({
      status,
      adminRemarks: remarks,
      reviewedBy: adminId,
      reviewedAt: new Date()
    })
    .where(eq(candidateApplications.id, applicationId));

  return await getApplicationByIdService(applicationId);
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
 */
export const withdrawApplicationService = async (id: string, userId: string) => {
  return await db.delete(candidateApplications)
    .where(and(
      eq(candidateApplications.id, id),
      eq(candidateApplications.userId, userId),
      // eq(candidateApplications.status, 'pending')
    ))
    .returning();
};