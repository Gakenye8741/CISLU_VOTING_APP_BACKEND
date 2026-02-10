import { eq, and, desc, asc, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import { 
  candidates, 
  candidateApplications, 
  TinsertCandidate, 
  TselectCandidate 
} from "../../drizzle/schema";

/* =========================================================
   1️⃣ BALLOT PROMOTION (TRANSITION FROM APPLICATION)
========================================================= */

/**
 * Promotes an approved application to the official candidates table.
 * Uses TinsertCandidate to ensure only valid ballot data is inserted.
 */
export const promoteToBallotService = async (applicationId: string) => {
  return await db.transaction(async (tx) => {
    // 1. Fetch Application & verify approval
    const app = await tx.query.candidateApplications.findFirst({
      where: eq(candidateApplications.id, applicationId),
      with: { user: true }
    });

    if (!app || app.status !== 'approved') {
      throw new Error("Application must be approved before promotion to ballot.");
    }

    // 2. Auto-calculate sequential Ballot Number for [Election + Position]
    const lastCandidate = await tx.query.candidates.findFirst({
      where: and(
        eq(candidates.electionId, app.electionId),
        eq(candidates.positionId, app.positionId)
      ),
      orderBy: [desc(candidates.ballotNumber)],
    });

    const nextNumber = (lastCandidate?.ballotNumber ?? 0) + 1;

    // 3. Insert into Ballot using inferred Insert Type
    const ballotData: TinsertCandidate = {
      electionId: app.electionId,
      positionId: app.positionId,
      userId: app.userId,
      applicationId: app.id,
      fullName: app.user.fullName,
      manifesto: app.manifesto,
      imageUrl: app.imageUrl,
      ballotNumber: nextNumber,
    };

    const [newCandidate] = await tx.insert(candidates)
      .values(ballotData)
      .returning();

    return newCandidate;
  });
};

/* =========================================================
   2️⃣ BALLOT MANAGEMENT (RETRIEVAL)
========================================================= */

/**
 * Get the full ballot for an election.
 * Scoped by Position and ordered by Ballot Number.
 */
export const getFullElectionBallotService = async (electionId: string) => {
  return await db.query.candidates.findMany({
    where: eq(candidates.electionId, electionId),
    orderBy: [asc(candidates.positionId), asc(candidates.ballotNumber)],
    with: {
      position: true,
      user: { columns: { studentRegNo: true } }
    }
  });
};

/**
 * Get a specific Candidate's profile for the "Details" page.
 */
export const getCandidateProfileService = async (id: string): Promise<TselectCandidate | undefined> => {
  return await db.query.candidates.findFirst({
    where: eq(candidates.id, id),
    with: {
      position: true,
      election: true
    }
  }) as TselectCandidate;
};

/* =========================================================
   3️⃣ DISCIPLINARY ACTIONS (DISQUALIFICATION)
========================================================= */

/**
 * Disqualify a candidate and automatically re-sequence remaining ballot numbers.
 */
export const disqualifyFromBallotService = async (candidateId: string, adminId: string, reason: string) => {
  return await db.transaction(async (tx) => {
    const candidate = await tx.query.candidates.findFirst({
      where: eq(candidates.id, candidateId)
    });

    if (!candidate) throw new Error("Candidate not found on ballot.");

    // 1. Clean up Application status
    if (candidate.applicationId) {
      await tx.update(candidateApplications)
        .set({ 
          status: 'rejected', 
          adminRemarks: `DISQUALIFIED: ${reason}`,
          reviewedBy: adminId 
        })
        .where(eq(candidateApplications.id, candidate.applicationId));
    }

    // 2. Remove from active candidates
    await tx.delete(candidates).where(eq(candidates.id, candidateId));

    // 3. SQL RE-SEQUENCING: Prevent gaps like (1, 3, 4)
    await tx.update(candidates)
      .set({ ballotNumber: sql`${candidates.ballotNumber} - 1` })
      .where(and(
        eq(candidates.electionId, candidate.electionId),
        eq(candidates.positionId, candidate.positionId),
        sql`${candidates.ballotNumber} > ${candidate.ballotNumber}`
      ));

    return { message: "Disqualified and ballot re-sequenced" };
  });
};

/**
 * Get candidates for a specific position (The Voter's View)
 * This is used to populate the voting cards for a specific category.
 */
export const getPositionBallotService = async (electionId: string, positionId: string) => {
  return await db.query.candidates.findMany({
    where: and(
      eq(candidates.electionId, electionId),
      eq(candidates.positionId, positionId)
    ),
    orderBy: [asc(candidates.ballotNumber)],
    // We include the user details so the UI can show the candidate's 
    // real-world identity (Reg No) alongside their ballot info.
    with: {
      user: {
        columns: {
          fullName: true,
          studentRegNo: true,
        }
      },
      position: {
        columns: {
          title: true
        }
      }
    }
  });
};