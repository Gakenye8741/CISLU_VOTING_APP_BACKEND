import { RequestHandler } from "express";
import { 
  validateCandidateBallot, 
  disqualificationSchema 
} from "../../validators/Candidate.validator";
import { 
  promoteToBallotService, 
  getFullElectionBallotService, 
  getPositionBallotService, 
  getCandidateProfileService, 
  disqualifyFromBallotService 
} from "./candidates.service";

// ---------------------------------------------------------
// 1. PROMOTION: Move Approved App to Official Ballot
// ---------------------------------------------------------
/**
 * Triggers the transition from a successful application to a live candidate.
 */
export const promoteToBallot: RequestHandler = async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Execute service which handles the internal state checks and auto-numbering
    const candidate = await promoteToBallotService(applicationId);

    res.status(201).json({
      message: "Candidate has been officially placed on the ballot.",
      candidate
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to promote candidate to ballot." });
  }
};

// ---------------------------------------------------------
// 2. READ: Ballot Retrieval (Voter & Admin Views)
// ---------------------------------------------------------

/**
 * Get the full election ballot (Used for overall election management)
 */
export const getElectionBallot: RequestHandler = async (req, res) => {
  try {
    const { electionId } = req.params;
    const ballot = await getFullElectionBallotService(electionId);
    res.status(200).json(ballot);
  } catch (error: any) {
    res.status(500).json({ error: "Could not retrieve election ballot." });
  }
};

/**
 * Get detailed profile for a single candidate
 */
export const getCandidateProfile: RequestHandler = async (req, res) => {
  try {
    const candidate = await getCandidateProfileService(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found." });
    
    res.status(200).json(candidate);
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error." });
  }
};

// ---------------------------------------------------------
// 3. DISCIPLINARY: Disqualification
// ---------------------------------------------------------
/**
 * Uses the Disqualification Validator to ensure a reason is provided.
 * Removes the candidate and fixes ballot numbering automatically.
 */
export const disqualifyCandidate: RequestHandler = async (req, res) => {
  try {
    // 1. Validate the reason for disciplinary action using your validator
    const validation = disqualificationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Invalid disqualification request", 
        errors: validation.error.issues 
      });
    }

    const { id } = req.params; // The Candidate ID
    const adminId = (req as any).user.id; // From Bearer Auth middleware
    const { reason } = validation.data;

    // 2. Execute service logic
    const result = await disqualifyFromBallotService(id, adminId, reason);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Disqualification process failed." });
  }
};


/**
 * Controller to fetch candidates filtered by Position
 * Used specifically for the "Polling Station" view on the frontend.
 */
export const getPositionBallot: RequestHandler = async (req, res) => {
  try {
    // 1. Extract IDs from the request parameters
    const { electionId, positionId } = req.params;

    // 2. Validate presence of IDs
    if (!electionId || !positionId) {
      return res.status(400).json({ 
        error: "Both Election ID and Position ID are required to view the ballot." 
      });
    }

    // 3. Call the service to fetch ordered candidates
    const candidates = await getPositionBallotService(electionId, positionId);

    // 4. Handle empty positions (No candidates approved yet)
    if (!candidates || candidates.length === 0) {
      return res.status(200).json({
        message: "No approved candidates found for this position.",
        candidates: []
      });
    }

    // 5. Return the candidates sorted by ballot number
    res.status(200).json(candidates);

  } catch (error: any) {
    console.error("Error in getPositionBallot:", error.message);
    res.status(500).json({ 
      error: "Internal server error while fetching the position ballot." 
    });
  }
};