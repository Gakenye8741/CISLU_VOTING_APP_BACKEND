import { RequestHandler } from "express";
import { 
  recordParticipationSchema, 
  voterStatusSchema 
} from "../../validators/vote-history.validator";
import { 
  recordParticipationService, 
  checkVoterStatusService, 
  getElectionParticipantsService, 
  getTurnoutStatsService 
} from "./history.service";

/* =========================================================
   1️⃣ RECORD PARTICIPATION (THE VOTE GATEWAY)
========================================================= */
/**
 * Log that a user has cast their ballot.
 * This is usually called within the 'Cast Vote' flow.
 */
export const logParticipation: RequestHandler = async (req, res) => {
  try {
    // 1. Collect data from request and metadata
    const payload = {
      userId: (req as any).user.id, // Extracted from JWT
      electionId: req.body.electionId,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent"),
    };

    // 2. Validate using Zod
    const validation = recordParticipationSchema.safeParse(payload);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.issues });
    }

    // 3. Execute Service (This will throw if they already voted)
    const record = await recordParticipationService(validation.data);

    res.status(201).json({
      message: "Participation recorded. You have successfully participated in this election.",
      auditId: record.id,
      timestamp: record.votedAt
    });
  } catch (error: any) {
    // Handle the "Unique Constraint" error specifically
    res.status(403).json({ error: error.message || "Could not record participation." });
  }
};

/* =========================================================
   2️⃣ VOTER STATUS (UI HELPERS)
========================================================= */
/**
 * Check if the current logged-in user has already voted.
 * Used to toggle the "Vote Now" button on the frontend.
 */
export const checkMyVoterStatus: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { electionId } = req.params;

    const status = await checkVoterStatusService(userId, electionId);
    res.status(200).json(status);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to check voter status." });
  }
};

/* =========================================================
   3️⃣ ADMIN AUDIT & ANALYTICS
========================================================= */
/**
 * Get a list of everyone who has voted (The Audit Roll)
 * Authorized for Admins/Patrons only.
 */
export const getElectionAuditTrail: RequestHandler = async (req, res) => {
  try {
    const { electionId } = req.params;
    const participants = await getElectionParticipantsService(electionId);
    res.status(200).json(participants);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch audit trail." });
  }
};

/**
 * Get real-time turnout numbers.
 */
export const getRealTimeTurnout: RequestHandler = async (req, res) => {
  try {
    const { electionId } = req.params;
    const stats = await getTurnoutStatsService(electionId);
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to calculate turnout." });
  }
};