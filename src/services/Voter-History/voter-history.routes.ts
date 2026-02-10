import { Router } from "express";
import {
  logParticipation,
  checkMyVoterStatus,
  getElectionAuditTrail,
  getRealTimeTurnout
} from "./voter-history.controller";
import { adminAuth, anyAuthenticatedUser } from "../../middlewares/bearAuth";

const VoterHistoryRouter = Router();

// ---------------------------------------------------------
// 1. VOTER INTERFACE (Student/Member)
// ---------------------------------------------------------

/**
 * Check if the logged-in user has already voted in a specific election.
 * Used by the frontend to toggle the "Vote" button.
 */
VoterHistoryRouter.get(
  "/status/:electionId", 
  anyAuthenticatedUser, 
  checkMyVoterStatus
);

/**
 * Record that the user is submitting their ballot.
 * This is the gateway to the voting process.
 */
VoterHistoryRouter.post(
  "/participate", 
  anyAuthenticatedUser, 
  logParticipation
);

// ---------------------------------------------------------
// 2. ADMIN & AUDIT INTERFACE (Patron/Board)
// ---------------------------------------------------------

/**
 * Get a detailed audit log of every member who has voted.
 * Shows names, Reg Nos, and timestamps for transparency.
 */
VoterHistoryRouter.get(
  "/audit/:electionId", 
  adminAuth, 
  getElectionAuditTrail
);

/**
 * Get real-time statistics on voter turnout.
 * Provides a quick count of total ballots cast so far.
 */
VoterHistoryRouter.get(
  "/turnout/:electionId", 
  adminAuth, 
  getRealTimeTurnout
);

export default VoterHistoryRouter;