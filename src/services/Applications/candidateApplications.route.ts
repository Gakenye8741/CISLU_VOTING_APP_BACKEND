import { Router } from "express";
import {
  applyForPosition,            // create
  getElectionApplications,      // list by election
  getApplicationDetails,        // get one
  reviewApplication,           // update status (Admin)
  updateMyApplication,         // update content (Student)
  withdrawApplication,          // delete (Student/Admin)
  getMyApplications,           // 
} from "./candidateApplications.controller";
import { adminAuth, anyAuthenticatedUser } from "../../middlewares/bearAuth";

const CandidateApplicationsRouter = Router();

// ---------------------------------------------------------
// 1. STUDENT ACTIONS (Authenticated)
// ---------------------------------------------------------

// Submit a new application
CandidateApplicationsRouter.post("/", anyAuthenticatedUser, applyForPosition);

// Get my own applications ✅ ADD THIS LINE
CandidateApplicationsRouter.get("/my", anyAuthenticatedUser, getMyApplications);

// Edit own application (Only if still 'pending')
CandidateApplicationsRouter.patch("/:id", anyAuthenticatedUser, updateMyApplication);

// Withdraw own application
CandidateApplicationsRouter.delete("/:id/withdraw", anyAuthenticatedUser, withdrawApplication);


// ---------------------------------------------------------
// 2. SCRUTINY & ADMIN ACTIONS (Admin Only)
// ---------------------------------------------------------

// Get all applications for a specific election
// URL: /api/candidate-applications/election/:electionId
CandidateApplicationsRouter.get("/election/:electionId", adminAuth, getElectionApplications);

// Get specific application details
CandidateApplicationsRouter.get("/:id", adminAuth, getApplicationDetails);

// Review application (Approve/Reject/Under Review)
// URL: PATCH /api/candidate-applications/:id/review
CandidateApplicationsRouter.patch("/:id/review", adminAuth, reviewApplication);

// Hard delete an application (Admin only)
CandidateApplicationsRouter.delete("/:id", adminAuth, withdrawApplication);


export default CandidateApplicationsRouter;