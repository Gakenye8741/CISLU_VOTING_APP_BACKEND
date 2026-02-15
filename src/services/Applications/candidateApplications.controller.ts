import { RequestHandler } from "express";
import { 
  validateCandidateApplication, 
  reviewApplicationSchema 
} from "../../validators/Applications.validator";
import { 
  createApplicationService, 
  getElectionApplicationsService, 
  getApplicationByIdService, 
  reviewApplicationService, 
  updateManifestoService, 
  withdrawApplicationService 
} from "./candidateApplications.service";
import { getMyApplicationsService } from "../Applications/candidateApplications.service";
import { Request, Response } from "express";

// Add this controller function
export const getMyApplications: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const applications = await getMyApplicationsService(userId);

    res.status(200).json({ applications });
  } catch (error: any) {
    console.error("Error fetching my applications:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};

// ---------------------------------------------------------
// 1. CREATE: Submit Application
// ---------------------------------------------------------
export const applyForPosition: RequestHandler = async (req, res) => {
  try {
    // 1. Validate Input
    const validation = validateCandidateApplication(req.body);
    if (!validation.valid) return res.status(400).json({ errors: validation.errors });

    // 2. Extract requiredPoints (usually passed from the position lookup)
    const { requiredPoints } = req.body; 

    // 3. Call Service (Uses the Insert Type internally)
    const application = await createApplicationService(validation.data!, requiredPoints || 0);

    res.status(201).json({
      message: "Application submitted successfully",
      application
    });
  } catch (error: any) {
    res.status(403).json({ error: error.message || "Failed to submit application" });
  }
};

// ---------------------------------------------------------
// 2. READ: Get Applications
// ---------------------------------------------------------

// Get all applications for a specific election (Admin/Committee)
export const getElectionApplications: RequestHandler = async (req, res) => {
  try {
    const { electionId } = req.params;
    const applications = await getElectionApplicationsService(electionId);
    res.status(200).json(applications);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};

// Get specific application details
export const getApplicationDetails: RequestHandler = async (req, res) => {
  try {
    const application = await getApplicationByIdService(req.params.id);
    if (!application) return res.status(404).json({ error: "Application not found" });
    res.status(200).json(application);
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------------------------------------------------
// 3. UPDATE: Scrutiny Review & Edits
// ---------------------------------------------------------

// Admin Review (Approve/Reject)
export const reviewApplication: RequestHandler = async (req, res) => {
  try {
    const validation = reviewApplicationSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: validation.error.issues });

    const adminId = (req as any).user.id; // From auth middleware
    const { id } = req.params;

    const updated = await reviewApplicationService(
      id, 
      adminId, 
      validation.data.status, 
      validation.data.adminRemarks
    );

    res.status(200).json({ message: "Application status updated", updated });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update application status" });
  }
};

// User Edit (Manifesto/Statement)
export const updateMyApplication: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const updated = await updateManifestoService(id, userId, req.body);
    res.status(200).json({ message: "Manifesto updated successfully", updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ---------------------------------------------------------
// 4. DELETE: Withdrawal
// ---------------------------------------------------------
export const withdrawApplication: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const deleted = await withdrawApplicationService(id, userId);
    if (!deleted.length) return res.status(400).json({ error: "Could not withdraw application" });

    res.status(200).json({ message: "Application withdrawn successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
};