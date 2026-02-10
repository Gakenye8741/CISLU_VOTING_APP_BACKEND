import { Router } from "express";
import {
  getMyProfile,
  listAllUsers,
  updateStatus,
  addPoints,
  verifyEligibility,
  requestUnlock,    // New
  resendUnlock,     // New
  verifyAndUnlock,  // New
} from "./users.controller";
import { adminAuth, anyAuthenticatedUser } from "../../middlewares/bearAuth";

const UsersRouter = Router();

// -------------------------------
// 1. Public / Auth Recovery (No Token Required)
// -------------------------------

// Request the initial unlock code via email
UsersRouter.post("/request-unlock", requestUnlock);

// Resend the code (with 60s rate limiting)
UsersRouter.post("/resend-unlock", resendUnlock);

// Submit code to reset 'isLocked' and 'failedAttempts'
UsersRouter.post("/verify-unlock", verifyAndUnlock);


// -------------------------------
// 2. Profile & Eligibility (Authenticated)
// -------------------------------

// Get current logged-in user profile
UsersRouter.get("/me", anyAuthenticatedUser, getMyProfile);

// Check if a specific user is eligible for a position
UsersRouter.get("/eligible/:userId", anyAuthenticatedUser, verifyEligibility);


// -------------------------------
// 3. Admin Management (Admin Only)
// -------------------------------

// Get all users (Paginated)
UsersRouter.get("/", adminAuth, listAllUsers);

// Update account status (Ban/Unban or Good Standing)
UsersRouter.patch("/status/:id", adminAuth, updateStatus);

// Update participation points (Reward/Deduct)
UsersRouter.patch("/points/:id", adminAuth, addPoints);


export default UsersRouter;