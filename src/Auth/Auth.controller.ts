import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendNotificationEmail } from "../middlewares/GoogleMAiler"; 
import {
  registerUserService,
  loginUserService,
  completeStudentProfileService,
  updateUserPasswordService,
  getUserByRegNoService,
  forgotPasswordService,
  resetPasswordService,
} from "./Auth.service";

import {
  registerUserValidator,
  loginUserValidator,
  completeProfileValidator,
  updatePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../validators/Auth.validator";
import { incrementFailedLoginService, recordSuccessfulLoginService } from "../services/users/users.service";

const SALT_ROUNDS = 10;
const WEBSITE_URL = "https://luvotingapp.netlify.app/";

// -------------------------------
// 1. Register a new user
// -------------------------------
export const registerUser: RequestHandler = async (req, res) => {
  try {
    const parseResult = registerUserValidator.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ error: parseResult.error.issues });

    const { studentRegNo, email, password, role } = parseResult.data;

    const existingUser = await getUserByRegNoService(studentRegNo);
    if (existingUser) return res.status(400).json({ error: "Student is already registered" });

    const passwordSource = password || studentRegNo;
    const hashedPassword = await bcrypt.hash(passwordSource, SALT_ROUNDS);

    const newUser = await registerUserService(studentRegNo, email, hashedPassword, role);

    const emailMessage = `
      <p>Welcome to the digital frontier! Your official voting account has been provisioned on the <strong>LU Clubs Platform</strong>.</p>
      <div class="btn-box">
        <strong>Login ID:</strong> <span class="highlight">${studentRegNo}</span><br>
        <strong>Temporary Password:</strong> <span class="highlight">${passwordSource}</span>
      </div>
      <div style="margin: 20px 0;">
        <a href="${WEBSITE_URL}" style="background-color: #003366; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Voting Portal</a>
      </div>
      <p><strong>Next Steps:</strong><br> 
      1. Login to the portal.<br>
      2. Update your password immediately.<br>
      3. Complete your profile to gain voting eligibility.</p>
    `;

    await sendNotificationEmail(email, "Account Provisioned", emailMessage, undefined, "credentials");

    res.status(201).json({ 
      message: "Registration successful. Credentials sent to email.", 
      user: { id: newUser.id, studentRegNo: newUser.studentRegNo, email: newUser.email }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------
// 2. Login user
// -------------------------------
export const loginUser: RequestHandler = async (req, res) => {
  try {
    const parseResult = loginUserValidator.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ error: parseResult.error.issues });

    const { studentRegNo, password } = parseResult.data;

    // 1. Fetch user by RegNo only
    const user = await getUserByRegNoService(studentRegNo);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Check if account is already hard-locked
    if (user.isLocked) {
      return res.status(403).json({ 
        error: "Account is locked due to 3 failed attempts. Please use the unlock link to generate a security code or contact Admin." 
      });
    }

    // 3. Verify Password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // 4. TRIGGER FAILED LOGIN TRACKING
      await incrementFailedLoginService(studentRegNo);
      
      const updatedUser = await getUserByRegNoService(studentRegNo);
      const attemptsLeft = 3 - (updatedUser?.failedLoginAttempts || 0);

      return res.status(401).json({ 
        error: attemptsLeft <= 0 
          ? "Account has been locked. Click the unlock link to generate your security code." 
          : `Invalid password. ${attemptsLeft} attempts remaining.` 
      });
    }

    // 5. Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ error: "Your account has been deactivated by an admin." });
    }

    // 6. Success Logic: Reset failed attempts and update timestamp
    await recordSuccessfulLoginService(user.id);

    // Prepare payload for Token and Response
    const payload = {
      id: user.id,
      studentRegNo: user.studentRegNo,
      fullName: user.fullName,
      role: user.role,
      yearOfStudy: user.yearOfStudy,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "24h" });

    // 7. UPDATED REDIRECT LOGIC
    const isProfileIncomplete = !(
      user.fullName && 
      user.yearOfStudy && 
      user.fullName !== user.studentRegNo
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: payload,
      requireProfileCompletion: isProfileIncomplete, 
    });

  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
};

// -------------------------------
// 3. Complete profile
// -------------------------------
export const completeProfile: RequestHandler = async (req, res) => {
  try {
    const parseResult = completeProfileValidator.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ error: parseResult.error.issues });

    const studentRegNo = (req.body.studentRegNo || req.query.studentRegNo) as string;
    const { fullName, yearOfStudy, email } = parseResult.data;

    const updatedUser = await completeStudentProfileService(studentRegNo, fullName, yearOfStudy, email);

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------
// 4. Forgot Password (Generates Link)
// -------------------------------
export const forgotPassword: RequestHandler = async (req, res) => {
  try {
    const parseResult = forgotPasswordValidator.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ error: parseResult.error.issues });

    const { studentRegNo, email } = parseResult.data;
    
    // Verify user identity
    const user = await getUserByRegNoService(studentRegNo);
    if (!user || user.email !== email) {
      return res.status(404).json({ error: "No matching user found with those credentials." });
    }

    // Create temporary reset token (Valid for 1 hour)
    const resetToken = jwt.sign(
      { studentRegNo: user.studentRegNo, type: "reset_password" },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    // Using the Netlify URL for the reset flow
    const resetLink = `https://luvotingapp.netlify.app/reset-password?token=${resetToken}`;

    const emailMessage = `
      <p>Hello <span class="highlight">${user.fullName || studentRegNo}</span>,</p>
      <p>We received a request to reset your password for the <strong>LU Clubs Online Platform</strong>.</p>
      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetLink}" style="background-color: #003366; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
          Reset Password
        </a>
      </div>
      <p>This link is valid for <strong>1 hour</strong>. If you did not make this request, please ignore this email; your password will remain unchanged.</p>
      <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        Button not working? Copy this link: <br> ${resetLink}
      </p>
    `;

    await sendNotificationEmail(email, "Password Reset Link", emailMessage, undefined, "password-reset");

    res.status(200).json({ message: "A secure reset link has been sent to your email." });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// -------------------------------
// 5. Reset Password (Unauthenticated - Using Token)
// -------------------------------
export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) return res.status(400).json({ error: "Reset token is required." });

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.type !== "reset_password") throw new Error("Invalid token type.");

    const studentRegNo = decoded.studentRegNo;
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await resetPasswordService(studentRegNo, hashedNewPassword);

    const user = await getUserByRegNoService(studentRegNo);
    if (user) {
      const resetMsg = `
        <p>Your password for account <span class="highlight">${studentRegNo}</span> has been successfully reset.</p>
        <p>You can now log in using your new credentials.</p>
        <div style="margin: 20px 0;">
          <a href="${WEBSITE_URL}" style="background-color: #003366; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Login Now</a>
        </div>
        <p>If you did <strong>not</strong> authorize this change, contact IT immediately.</p>
      `;
      await sendNotificationEmail(user.email, "Security Confirmation", resetMsg, undefined, "password-reset");
    }

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error: any) {
    res.status(401).json({ error: "Reset link has expired or is invalid. Please request a new one." });
  }
};

// -------------------------------
// 6. Update password (Authenticated)
// -------------------------------
export const updatePassword: RequestHandler = async (req, res) => {
  try {
    const parseResult = updatePasswordValidator.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ error: parseResult.error.issues });

    const studentRegNo = (req as any).user?.studentRegNo; 
    if (!studentRegNo) return res.status(401).json({ error: "Unauthorized: Missing user info" });

    const { currentPassword, password: newPassword } = parseResult.data;

    const existingUser = await getUserByRegNoService(studentRegNo);
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, existingUser.password);
    if (!isMatch) {
      return res.status(401).json({ error: "The current password you entered is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    await updateUserPasswordService(studentRegNo, hashedPassword);

    const updateMsg = `
        <p>Hello <span class="highlight">${existingUser.fullName || studentRegNo}</span>,</p>
        <p>This is an automated confirmation that your password has been successfully updated.</p>
        <div style="margin: 20px 0;">
          <a href="${WEBSITE_URL}" style="background-color: #28a745; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Return to App</a>
        </div>
        <p><em>Security Tip: Remember to never share your credentials with anyone.</em></p>
      `;
    await sendNotificationEmail(existingUser.email, "Password Updated", updateMsg, undefined, "password-update");

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------
// 7. Search User (Admin/Service use)
// -------------------------------
export const getUserByRegNo: RequestHandler = async (req, res) => {
  try {
    const studentRegNo = (req.query.studentRegNo || req.body.studentRegNo) as string;
    const user = await getUserByRegNoService(studentRegNo);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { password, ...safeUser } = user;
    res.status(200).json({ user: safeUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};