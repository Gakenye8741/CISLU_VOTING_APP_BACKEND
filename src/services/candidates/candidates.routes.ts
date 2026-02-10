import { Router } from "express";
import {
  promoteToBallot,           // Replaces createCandidate
  getElectionBallot,         // Replaces getAllCandidates (scoped to election)
  getPositionBallot,         // Specific for voting booth
  getCandidateProfile,       // Get by ID
  disqualifyCandidate        // Replaces delete (handled via disciplinary logic)
} from "./candidates.controller";

import { adminAuth, anyAuthenticatedUser } from "../../middlewares/bearAuth";

const CandidatesRouter = Router();

// ---------------------------------------------------------
// 1. PUBLIC / VOTER ROUTES (Authenticated)
// ---------------------------------------------------------

/**
 * Get the full ballot for an election
 * URL: /api/candidates/election/:electionId
 */
CandidatesRouter.get("/election/:electionId", anyAuthenticatedUser, getElectionBallot);

/**
 * Get candidates for a specific position (The Voting Booth View)
 * URL: /api/candidates/election/:electionId/position/:positionId
 */
CandidatesRouter.get(
  "/election/:electionId/position/:positionId", 
  anyAuthenticatedUser, 
  getPositionBallot
);

/**
 * Get detailed candidate profile
 * URL: /api/candidates/:id
 */
CandidatesRouter.get("/:id", anyAuthenticatedUser, getCandidateProfile);


// ---------------------------------------------------------
// 2. ADMIN / PATRON ROUTES (Protected)
// ---------------------------------------------------------

/**
 * Promote an approved application to the official ballot
 * URL: POST /api/candidates/promote/:applicationId
 */
CandidatesRouter.post("/promote/:applicationId", adminAuth, promoteToBallot);

/**
 * Disqualify a candidate (Disciplinary Action)
 * This removes them from ballot and re-sequences the numbers
 * URL: PATCH /api/candidates/:id/disqualify
 */
CandidatesRouter.patch("/:id/disqualify", adminAuth, disqualifyCandidate);

export default CandidatesRouter;