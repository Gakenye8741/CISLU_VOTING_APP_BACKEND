import { Router } from "express";
import { 
  handleCastVote, 
  handleCastBulkBallot,
  getPositionResults, 
  getElectionAnalytics, 
  getCandidateStats, 
  handleVerifyVote,
  getMyVotingProgress,
  getElectionWinners
} from "./votes.controller";
import { anyAuthenticatedUser, adminAuth } from "../../middlewares/bearAuth";

const VotesRouter = Router();

/* =========================================================
   🗳️ VOTER INTERFACE (Authenticated Students)
========================================================= */

// Cast a single vote for a specific position
VotesRouter.post("/cast", anyAuthenticatedUser, handleCastVote);

// Cast multiple votes at once (The preferred method for full ballots)
VotesRouter.post("/bulk", anyAuthenticatedUser, handleCastBulkBallot);

// Verify a vote exists in the box using a private receipt
VotesRouter.post("/verify", anyAuthenticatedUser, handleVerifyVote);

// Check which positions the current user has already voted for
VotesRouter.get("/progress/:electionId", anyAuthenticatedUser, getMyVotingProgress);

// Get the live leaderboard for a specific position
VotesRouter.get("/results/position/:positionId", anyAuthenticatedUser, getPositionResults);


/* =========================================================
   📊 ADMINISTRATIVE & AUDIT (Admin / Election Board)
========================================================= */

// Get official winners, vote margins, and tie detection
VotesRouter.get("/winners/:electionId", adminAuth, getElectionWinners);

// Get deep-dive turnout, demographics, and the full audit trail
VotesRouter.get("/analytics/election/:electionId", adminAuth, getElectionAnalytics);

// Get a detailed performance scorecard for a specific candidate
VotesRouter.get("/analytics/candidate/:candidateId", adminAuth, getCandidateStats);

export default VotesRouter;