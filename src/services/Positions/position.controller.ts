import { RequestHandler } from "express";
import { positionValidator, updatePositionValidator } from "../../validators/positions.validator";
import { createPositionService, deletePositionService, getEligiblePositionsService, getPositionsByElectionService, updatePositionService } from "./position.service";

// -------------------------------
// 1. Create a New Position (Admin Only)
// -------------------------------
export const createPosition: RequestHandler = async (req, res) => {
  const parseResult = positionValidator.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Validation Failed", details: parseResult.error.issues });
  }

  try {
    const newPosition = await createPositionService(parseResult.data);
    res.status(201).json({ message: "Position created successfully", position: newPosition });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create position" });
  }
};

// -------------------------------
// 2. Get All Positions for an Election
// -------------------------------
export const getPositionsByElection: RequestHandler = async (req, res) => {
  try {
    const { electionId } = req.params;
    const positions = await getPositionsByElectionService(electionId);
    res.status(200).json({ positions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch positions" });
  }
};

// -------------------------------
// 3. Get Eligible Positions (Ballot View)
// -------------------------------
/**
 * Uses the year from the authenticated user's JWT to filter positions
 */
export const getEligiblePositions: RequestHandler = async (req, res) => {
  try {
    const { electionId } = req.params;
    // req.user comes from your anyAuthenticatedUser middleware
    const studentYear = req.user?.regNo; // Or however your JWT stores the student's year

    // If your JWT doesn't have the year directly, you might need a query param:
    const year = (req.query.year as string) || "Year 1"; 

    const positions = await getEligiblePositionsService(electionId, year);
    res.status(200).json({ positions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch eligible positions" });
  }
};

// -------------------------------
// 4. Update Position (Admin Only)
// -------------------------------
export const updatePosition: RequestHandler = async (req, res) => {
  const parseResult = updatePositionValidator.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Validation Failed", details: parseResult.error.issues });
  }

  try {
    const { id } = req.params;
    const updated = await updatePositionService(id, parseResult.data);
    
    if (!updated) {
      return res.status(404).json({ error: "Position not found" });
    }

    res.status(200).json({ message: "Position updated successfully", position: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Update failed" });
  }
};

// -------------------------------
// 5. Delete Position (Admin Only)
// -------------------------------
export const deletePosition: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await deletePositionService(id);
    res.status(200).json({ message });
  } catch (error: any) {
    const status = error.message === "Position not found" ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
};