import { RequestHandler } from "express";
import {
  createElectionService,
  getAllElectionsService,
  getElectionByIdService,
  updateElectionService,
  changeElectionStatusService,
  deleteElectionService,
} from "./elections.service";
import { TinsertElection } from "../../drizzle/schema";
import {
  electionValidator,
  changeElectionStatusValidator,
  updateElectionValidator,
} from "../../validators/elections.validator";

// -------------------------------
// 1. Create Election
// -------------------------------
export const createElection: RequestHandler = async (req, res) => {
  const parseResult = electionValidator.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  try {
    const data = parseResult.data;
    const electionData: TinsertElection = {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    };

    const newElection = await createElectionService(electionData);
    res.status(201).json({ message: "Election created", election: newElection });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------
// 2. Get All Elections
// -------------------------------
export const getAllElections: RequestHandler = async (_req, res) => {
  try {
    const elections = await getAllElectionsService();
    res.status(200).json({ elections });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------
// 3. Get Election By ID
// -------------------------------
export const getElectionById: RequestHandler = async (req, res) => {
  try {
    const election = await getElectionByIdService(req.params.id);
    if (!election) return res.status(404).json({ error: "Election not found" });
    res.status(200).json({ election });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------
// 4. Update Election
// -------------------------------
export const updateElection: RequestHandler = async (req, res) => {
  // Use the dedicated update validator instead of .partial()
  const parseResult = updateElectionValidator.safeParse(req.body);
  
  if (!parseResult.success) {
    return res.status(400).json({ 
      error: "Validation Failed", 
      details: parseResult.error.issues 
    });
  }

  try {
    const { id } = req.params;
    const data = parseResult.data;

    // Map validated strings to Date objects for the Drizzle service
    const updates: Partial<TinsertElection> = {
      ...data,
      // Only convert if the field exists in the request body
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    };

    const updated = await updateElectionService(id, updates);
    
    if (!updated) {
      return res.status(404).json({ error: "Election not found" });
    }

    res.status(200).json({ 
      message: "Election updated successfully", 
      election: updated 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "An unexpected error occurred" });
  }
};

// -------------------------------
// 5. Change Status (Manual)
// -------------------------------
export const changeElectionStatus: RequestHandler = async (req, res) => {
  const parseResult = changeElectionStatusValidator.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }

  try {
    const updated = await changeElectionStatusService(req.params.id, parseResult.data.status as any);
    if (!updated) return res.status(404).json({ error: "Election not found" });

    res.status(200).json({ message: "Status updated", election: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------
// 6. Delete Election
// -------------------------------
export const deleteElection: RequestHandler = async (req, res) => {
  try {
    const message = await deleteElectionService(req.params.id);
    res.status(200).json({ message });
  } catch (error: any) {
    // If service throws "Election not found", send 404, otherwise 500
    const status = error.message === "Election not found" ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
};