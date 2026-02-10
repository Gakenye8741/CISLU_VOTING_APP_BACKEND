import { Router } from "express";
import {
  createPosition,
  getPositionsByElection,
  getEligiblePositions,
  updatePosition,
  deletePosition,
} from "./position.controller";

import { adminAuth, anyAuthenticatedUser } from "../../middlewares/bearAuth";

const PositionsRouter = Router();

// -------------------------------
// Creation & Stats
// -------------------------------

// Create a new position (Admin Only)
PositionsRouter.post("/", adminAuth, createPosition);


// -------------------------------
// Retrieval (Ballot & View Logic)
// -------------------------------

// Get all positions for a specific election
// URL: /api/positions/election/UUID
PositionsRouter.get("/election/:electionId", anyAuthenticatedUser, getPositionsByElection);

// Get positions a student is eligible to vote for (Based on their Year)
// URL: /api/positions/eligible/:electionId
PositionsRouter.get("/eligible/:electionId", anyAuthenticatedUser, getEligiblePositions);

// -------------------------------
// Admin Management
// -------------------------------

// Update position (Admin Only)
PositionsRouter.put("/:id", adminAuth, updatePosition);

// Delete position (Admin Only)
PositionsRouter.delete("/:id", adminAuth, deletePosition);

export default PositionsRouter;