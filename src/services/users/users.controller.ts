import { RequestHandler } from "express";
import {
  getUserByIdService,
  getAllUsersService,
  updateUserStatusService,
  updateParticipationPointsService,
  checkCandidateEligibilityService,
  generateUnlockCodeService,
  resendUnlockCodeService,
  verifyUnlockCodeService
} from "./users.service";
import { sendNotificationEmail } from "../../middlewares/GoogleMAiler";

// ---------------------------------------------------------
// 1. GET PROFILE (Self)
// ---------------------------------------------------------
export const getMyProfile: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?.userId; // Set by verifyToken middleware
    if (!userId) return res.status(401).json({ error: "Unauthorized access" });

    const user = await getUserByIdService(userId);
    if (!user) return res.status(404).json({ error: "User profile not found" });

    // Exclude sensitive security fields
    const { password, failedLoginAttempts, ...safeUser } = user;
    res.status(200).json(safeUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------
// 2. GET ALL USERS (Admin - Paginated)
// ---------------------------------------------------------
export const listAllUsers: RequestHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const usersList = await getAllUsersService(limit, offset);
    res.status(200).json(usersList);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to retrieve users" });
  }
};

// ---------------------------------------------------------
// 3. UPDATE USER STATUS (Admin - Ban/Standing)
// ---------------------------------------------------------
export const updateStatus: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isGoodStanding } = req.body;

    const updatedUser = await updateUserStatusService(
      id, 
      isActive ?? true, 
      isGoodStanding ?? true
    );

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ message: "User status updated", user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------
// 4. MANAGE PARTICIPATION POINTS (Admin)
// ---------------------------------------------------------
export const addPoints: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    if (typeof points !== 'number') {
      return res.status(400).json({ error: "Points must be a valid number" });
    }

    const [updated] = await updateParticipationPointsService(id, points);
    if (!updated) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ 
      message: `Points updated. New balance: ${updated.participationPoints}` 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------
// 5. CHECK CANDIDATE ELIGIBILITY (Internal/Public)
// ---------------------------------------------------------
export const verifyEligibility: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    const { requiredPoints } = req.query;

    const result = await checkCandidateEligibilityService(
      userId, 
      Number(requiredPoints) || 0
    );

    if (!result.eligible) {
      return res.status(403).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


// ---------------------------------------------------------
// 1. REQUEST UNLOCK CODE
// ---------------------------------------------------------
export const requestUnlock: RequestHandler = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const code = await generateUnlockCodeService(email);
    
    const message = `
      <p>Hello,</p>
      <p>Your account has been locked due to multiple failed login attempts. To restore access, please use the following security code:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7C3AED; background: #f3e8ff; padding: 10px 20px; border-radius: 8px; border: 2px solid #ddd;">
          ${code}
        </span>
      </div>
      <p>This code is valid for <strong>15 minutes</strong>. If you did not request this, please change your password immediately or contact the system administrator.</p>
    `;

    await sendNotificationEmail(email, "Account Unlock Code", message, undefined, "unlock-code");

    res.status(200).json({ message: "Verification code sent to your email." });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to send unlock code." });
  }
};

// ---------------------------------------------------------
// 2. RESEND UNLOCK CODE
// ---------------------------------------------------------
export const resendUnlock: RequestHandler = async (req, res) => {
  const { email } = req.body;

  try {
    const code = await resendUnlockCodeService(email);
    
    const message = `
      <p>Here is your new security code to unlock your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7C3AED; background: #f3e8ff; padding: 10px 20px; border-radius: 8px;">
          ${code}
        </span>
      </div>
      <p>Note: This new code invalidates any previous codes sent.</p>
    `;

    await sendNotificationEmail(email, "New Unlock Code Requested", message, undefined, "unlock-code");

    res.status(200).json({ message: "A new code has been sent." });
  } catch (error: any) {
    // Check for rate-limit error message from service
    const status = error.message.includes("wait") ? 429 : 500;
    res.status(status).json({ error: error.message });
  }
};

// ---------------------------------------------------------
// 3. VERIFY AND UNLOCK
// ---------------------------------------------------------
export const verifyAndUnlock: RequestHandler = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

  try {
    const result = await verifyUnlockCodeService(email, code);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Optional: Send a confirmation email that account is now safe
    await sendNotificationEmail(
      email, 
      "Account Restored", 
      "<p>Your account has been successfully unlocked. You can now log in with your credentials.</p>", 
      undefined, 
      "password-update"
    );

    res.status(200).json({ message: result.message });
  } catch (error: any) {
    res.status(500).json({ error: "An error occurred during verification." });
  }
};