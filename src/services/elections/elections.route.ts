import { Router } from "express";
import {
  createElection,
  getAllElections,
  getElectionById,
  updateElection,
  deleteElection,
  changeElectionStatus,
} from "./elections.controller";
import { adminAuth, anyAuthenticatedUser } from "../../middlewares/bearAuth";

const ElectionRouter = Router();

// -------------------------------
// Public/Authenticated Routes
// -------------------------------

// Get all elections
ElectionRouter.get("/", anyAuthenticatedUser, getAllElections);

// Get specific election by UUID
ElectionRouter.get("/:id", anyAuthenticatedUser, getElectionById);

// -------------------------------
// Admin Protected Routes
// -------------------------------

// Create a new election
ElectionRouter.post("/", adminAuth, createElection);

// Full update of an election
ElectionRouter.put("/:id", adminAuth, updateElection);

// Delete an election
ElectionRouter.delete("/:id", adminAuth, deleteElection);

// Partially update election status explicitly (cancelled, completed, etc.)
ElectionRouter.patch("/:id/status", adminAuth, changeElectionStatus);

export default ElectionRouter;