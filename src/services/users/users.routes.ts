import { Router } from "express";
import {
  getMyProfile,
  updateProfile,
  listAllUsers,
  updateStatus,
  addPoints,
  verifyEligibility,
  requestUnlock,    
  resendUnlock,     
  verifyAndUnlock,
  adminUpdateUser,
  deleteUserAccount,
  changeUserRole, // New: Role management controller
} from "./users.controller";
import { adminAuth, anyAuthenticatedUser } from "../../middlewares/bearAuth";

const UsersRouter = Router();

// -------------------------------
// 1. Public / Auth Recovery (No Token Required)
// -------------------------------

UsersRouter.post("/request-unlock", requestUnlock);
UsersRouter.post("/resend-unlock", resendUnlock);
UsersRouter.post("/verify-unlock", verifyAndUnlock);


// -------------------------------
// 2. Profile & Eligibility (Authenticated)
// -------------------------------

// Get current logged-in user profile
UsersRouter.get("/me", anyAuthenticatedUser, getMyProfile);

// Update current logged-in user profile (Self-service)
UsersRouter.put("/update-profile", anyAuthenticatedUser, updateProfile);

// Delete account (Logic in controller ensures users delete self OR admin deletes any)
UsersRouter.delete("/:id", anyAuthenticatedUser, deleteUserAccount);

// Check if a specific user is eligible for a position
UsersRouter.get("/eligible/:userId", anyAuthenticatedUser, verifyEligibility);


// -------------------------------
// 3. Admin Management (Admin Only)
// -------------------------------

// Get all users (Paginated)
UsersRouter.get("/", adminAuth, listAllUsers);

// Full user update (Admin only - includes password/email/regNo)
UsersRouter.put("/admin-update/:id", adminAuth, adminUpdateUser);

// Update User Role (Promote/Demote - Admin only)
UsersRouter.patch("/role/:id", adminAuth, changeUserRole);

// Update account status (Ban/Unban or Good Standing)
UsersRouter.patch("/status/:id", adminAuth, updateStatus);

// Update participation points (Reward/Deduct)
UsersRouter.patch("/points/:id", adminAuth, addPoints);


export default UsersRouter;