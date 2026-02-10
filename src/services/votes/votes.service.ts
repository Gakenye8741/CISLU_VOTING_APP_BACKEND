import db from "../../drizzle/db";
import { and, eq, sql } from "drizzle-orm";
import { votes, TinsertVote, TselectVote, candidates, positions, elections } from "../../drizzle/schema";
import crypto from "crypto";

/* =========================================================
   1️⃣ THE SECRET BALLOT BOX (Submission Logic)
========================================================= */

/**
 * Casts a single vote within a transaction.
 * Generates an anonymous receipt for voter verification.
 */
export const castVoteService = async (voteData: TinsertVote): Promise<TselectVote> => {
  if (!voteData.id || !voteData.positionId || !voteData.electionId) {
    throw new Error("Missing critical identifiers: voterId, positionId, and electionId are required.");
  }

  return await db.transaction(async (tx) => {
    const vId = voteData.id as string;
    const pId = voteData.positionId as string;

    const existing = await tx.query.votes.findFirst({
      where: and(
        eq(votes.id, vId),
        eq(votes.positionId, pId)
      ),
    });

    if (existing) {
      throw new Error(`Security Violation: A ballot has already been cast for this position.`);
    }

    const receipt = `VR-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now()}`;

    const [newVote] = await tx.insert(votes)
      .values({
        ...voteData,
        verificationReceipt: receipt,
      })
      .returning();

    return newVote;
  });
};

/* =========================================================
   NEW: 🚀 BULK BALLOT SUBMISSION
========================================================= */

/**
 * Allows a user to vote for multiple positions in a single action.
 * Uses an atomic transaction: all succeed or all fail.
 */
export const castBulkBallotService = async (
  voterId: string,
  electionId: string,
  yearGroup: "1" | "2" | "3" | "4",
  selections: { positionId: string; candidateId: string }[]
) => {
  return await db.transaction(async (tx) => {
    // Check if election is active
    const election = await tx.query.elections.findFirst({
      where: eq(elections.id, electionId)
    });

    if (!election || election.status !== 'voting') {
      throw new Error("Cannot cast ballot: This election is not currently active.");
    }

    const receipts: string[] = [];

    for (const selection of selections) {
      // Internal double-vote check
      const existing = await tx.query.votes.findFirst({
        where: and(eq(votes.id, voterId), eq(votes.positionId, selection.positionId)),
      });

      if (existing) continue; // Skip if already voted for this specific role

      const receipt = `VR-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now()}`;
      
      await tx.insert(votes).values({
        id: voterId,
        electionId,
        positionId: selection.positionId,
        candidateId: selection.candidateId,
        voterYearGroup: yearGroup,
        verificationReceipt: receipt,
      });

      receipts.push(receipt);
    }

    return { success: true, receipts };
  });
};

/* =========================================================
   2️⃣ POSITION-LEVEL ANALYTICS (The Leaderboard)
========================================================= */

export const getPositionDetailedAnalytics = async (positionId: string) => {
  const candidatesWithVotes = await db.query.candidates.findMany({
    where: (candidates, { eq }) => eq(candidates.positionId, positionId),
    with: {
      votes: { columns: { verificationReceipt: true } },
      position: { columns: { title: true } }
    }
  });

  const totalCategoryVotes = candidatesWithVotes.reduce((sum, c) => sum + c.votes.length, 0);

  return candidatesWithVotes.map(candidate => ({
    id: candidate.id,
    fullName: candidate.fullName,
    ballotNumber: candidate.ballotNumber,
    role: candidate.position?.title,
    tally: candidate.votes.length,
    percentage: totalCategoryVotes > 0 
      ? ((candidate.votes.length / totalCategoryVotes) * 100).toFixed(1) 
      : "0.0",
    receipts: candidate.votes.map(v => v.verificationReceipt)
  })).sort((a, b) => b.tally - a.tally);
};

/* =========================================================
   3️⃣ FULL ELECTION ANALYTICS (Admin Overview)
========================================================= */

export const getElectionTotalAnalytics = async (electionId: string) => {
  const allVotes = await db.query.votes.findMany({
    where: eq(votes.electionId, electionId),
    with: {
      candidate: { columns: { fullName: true } },
      position: { columns: { title: true } }
    }
  });

  const demographics = allVotes.reduce((acc: Record<string, number>, vote) => {
    const group = vote.voterYearGroup || 'Not Specified';
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});

  return {
    electionId,
    totalBallotsCast: allVotes.length,
    demographics,
    auditTrail: allVotes.map(v => ({
      receipt: v.verificationReceipt,
      candidate: v.candidate?.fullName,
      position: v.position?.title,
      timestamp: v.castAt
    }))
  };
};

/* =========================================================
   4️⃣ CANDIDATE PERFORMANCE SCORECARD
========================================================= */

export const getCandidateScorecard = async (candidateId: string) => {
  const data = await db.query.candidates.findFirst({
    where: (candidates, { eq }) => eq(candidates.id, candidateId),
    with: {
      votes: true,
      position: { with: { votes: true } }
    }
  });

  if (!data) throw new Error("Candidate record not found.");

  const personalVotes = data.votes.length;
  const totalPositionVotes = data.position?.votes.length || 0;

  return {
    name: data.fullName,
    position: data.position?.title,
    personalTally: personalVotes,
    shareOfVotes: totalPositionVotes > 0 
      ? ((personalVotes / totalPositionVotes) * 100).toFixed(2) + "%"
      : "0%",
    performanceIndex: personalVotes / (totalPositionVotes || 1)
  };
};

/* =========================================================
   5️⃣ VERIFICATION SERVICE
========================================================= */

export const verifyVoteByReceiptService = async (receipt: string) => {
  const vote = await db.query.votes.findFirst({
    where: (votes, { eq }) => eq(votes.verificationReceipt, receipt),
    with: {
      position: { columns: { title: true } },
      candidate: { columns: { fullName: true } },
      election: { columns: { title: true, status: true } }
    }
  });

  if (!vote) {
    throw new Error("Invalid verification receipt. This vote was not found.");
  }

  return {
    election: vote.election?.title,
    position: vote.position?.title,
    candidate: vote.candidate?.fullName,
    timestamp: vote.castAt,
    status: "Verified & Counted ✅"
  };
};

/* =========================================================
   NEW: 🏆 OFFICIAL RESULTS & WINNERS
========================================================= */

/**
 * Calculates winners for all positions in an election.
 * Detects ties and provides margins of victory.
 */
export const getOfficialElectionWinners = async (electionId: string) => {
  const electionPositions = await db.query.positions.findMany({
    where: eq(positions.electionId, electionId),
    with: {
      candidates: { with: { votes: true } }
    }
  });

  return electionPositions.map(pos => {
    const sorted = pos.candidates.sort((a, b) => b.votes.length - a.votes.length);
    const topCandidate = sorted[0];
    const secondCandidate = sorted[1];
    
    const isTie = topCandidate && secondCandidate && topCandidate.votes.length === secondCandidate.votes.length;

    return {
      position: pos.title,
      winner: isTie ? "TIE (Runoff Needed)" : topCandidate?.fullName || "No Candidates",
      totalVotes: pos.candidates.reduce((acc, c) => acc + c.votes.length, 0),
      margin: isTie ? 0 : (topCandidate.votes.length - (secondCandidate?.votes.length || 0))
    };
  });
};

/* =========================================================
   NEW: 🗳️ USER VOTING PROGRESS
========================================================= */

/**
 * Checks which positions a specific user has already voted for.
 * Useful for the UI to show "Voted" badges.
 */
export const getUserVotedPositions = async (userId: string, electionId: string) => {
  const voted = await db.query.votes.findMany({
    where: and(eq(votes.id, userId), eq(votes.electionId, electionId)),
    columns: { positionId: true }
  });

  return voted.map(v => v.positionId);
};