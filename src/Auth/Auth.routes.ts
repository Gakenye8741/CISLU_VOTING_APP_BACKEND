import { Router } from "express";
import {
  registerUser,
  loginUser,
  completeProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  getUserByRegNo,
} from "./Auth.controller";
import { anyAuthenticatedUser } from "../middlewares/bearAuth";

const AuthRouter = Router();

// -------------------------------
// Public Routes
// -------------------------------

// Register a new user (Password defaults to studentRegNo if not provided)
AuthRouter.post("/register", registerUser);

// Login (Returns token and profile completion status)
AuthRouter.post("/login", loginUser);

// Forgot Password (Verify identity via Reg No and Email)
AuthRouter.post("/forgot-password", forgotPassword);

// Reset Password (Final step after identity verification)
AuthRouter.post("/reset-password", resetPassword);

// -------------------------------
// Protected Routes (require JWT auth)
// -------------------------------

// Update password (Uses studentRegNo from the decoded JWT)
AuthRouter.put("/update-password", anyAuthenticatedUser, updatePassword);

// Complete profile (Used after first login to update name/year/email)
AuthRouter.put("/complete-profile", anyAuthenticatedUser, completeProfile);

// Get user by registration number: ?studentRegNo=SC/COM/0008/22
AuthRouter.get("/user/by-reg-no", anyAuthenticatedUser, getUserByRegNo);

export default AuthRouter;