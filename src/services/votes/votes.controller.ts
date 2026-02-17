import { Request, Response } from "express";
import { ZodError } from "zod";
import { 
  castVoteService, 
  castBulkBallotService,
  getPositionDetailedAnalytics, 
  getElectionTotalAnalytics, 
  getCandidateScorecard, 
  verifyVoteByReceiptService,
  getOfficialElectionWinners,
  getUserVotedPositions
} from "./votes.service";
import { castVoteSchema } from "../../validators/Vote.validator";

/* =========================================================
   1️⃣ CAST VOTE CONTROLLER (Single & Bulk)
========================================================= */

/**
 * Casts a single vote. 
 * Allows voting for different positions at different times.
 * Service layer handles the check: "Has this user ID already voted for this Position ID?"
 */
export const handleCastVote = async (req: Request, res: Response) => {
  try {
    const payload = {
      id: (req as any).user.id,
      electionId: req.body.electionId,
      positionId: req.body.positionId,
      candidateId: req.body.candidateId,
      voterYearGroup: (req as any).user.yearOfStudy, 
    };

    // Validate payload against schema
    const validatedData = castVoteSchema.parse(payload);
    
    // Execute service logic
    // Logic inside service: check unique(userId, positionId)
    const result = await castVoteService(validatedData);

    return res.status(201).json({
      success: true,
      message: "Your ballot for this position has been securely cast.",
      verificationReceipt: result.verificationReceipt,
      castAt: result.castAt
    });

  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation Error", details: error.errors });
    }

    // Handle Business Logic Errors (e.g., "Already voted for this position")
    if (error.message.includes("Security Violation") || error.message.includes("already cast")) {
      return res.status(403).json({ error: error.message });
    }

    // Detailed logging for your "Internal Server Error" debugging
    console.error("CRITICAL_VOTING_ERROR_NODE:", error.message);
    
    return res.status(500).json({ 
      error: "Internal Server Error during ballot submission.",
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

/**
 * NEW: Handle Bulk Ballot Submission
 */
export const handleCastBulkBallot = async (req: Request, res: Response) => {
  try {
    const voterId = (req as any).user.id;
    const yearGroup = (req as any).user.yearOfStudy;
    const { electionId, selections } = req.body;

    if (!selections || !Array.isArray(selections)) {
      return res.status(400).json({ error: "Selections must be an array of position/candidate pairs." });
    }

    const result = await castBulkBallotService(voterId, electionId, yearGroup, selections);

    return res.status(201).json(result);
  } catch (error: any) {
    console.error("BULK_VOTE_ERROR:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   2️⃣ USER EXPERIENCE & VERIFICATION
========================================================= */

/**
 * Verifies a vote using the anonymous receipt string.
 */
export const handleVerifyVote = async (req: Request, res: Response) => {
  try {
    const { receipt } = req.body;
    if (!receipt) {
      return res.status(400).json({ error: "Receipt string is required." });
    }

    const verification = await verifyVoteByReceiptService(receipt);
    return res.status(200).json(verification);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
};

/**
 * NEW: Get User Progress
 * Essential for your "Vote for SG later" logic. 
 * Frontend uses this to hide positions the user already voted for.
 */
export const getMyVotingProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { electionId } = req.params;
    
    const votedPositionIds = await getUserVotedPositions(userId, electionId);
    return res.status(200).json({ votedPositionIds });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not retrieve voting progress." });
  }
};

/* =========================================================
   3️⃣ ANALYTICS & RESULTS CONTROLLERS
========================================================= */

export const getPositionResults = async (req: Request, res: Response) => {
  try {
    const { positionId } = req.params;
    const results = await getPositionDetailedAnalytics(positionId);
    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({ error: "Could not retrieve results." });
  }
};

export const getElectionAnalytics = async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const analytics = await getElectionTotalAnalytics(electionId);
    return res.status(200).json(analytics);
  } catch (error: any) {
    return res.status(500).json({ error: "Could not generate analytics." });
  }
};

export const getElectionWinners = async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const winners = await getOfficialElectionWinners(electionId);
    return res.status(200).json(winners);
  } catch (error: any) {
    return res.status(500).json({ error: "Could not calculate official winners." });
  }
};

export const getCandidateStats = async (req: Request, res: Response) => {
  try {
    const { candidateId } = req.params;
    const scorecard = await getCandidateScorecard(candidateId);
    return res.status(200).json(scorecard);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
};