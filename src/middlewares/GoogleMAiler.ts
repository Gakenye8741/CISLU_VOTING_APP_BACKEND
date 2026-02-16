import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// 1. UPDATED: Added "account-closure" to the union type
type EmailType = 
  | "welcome" 
  | "credentials" 
  | "password-reset" 
  | "password-update" 
  | "vote-confirmation" 
  | "alert" 
  | "generic"
  | "unlock-code"
  | "account-closure"; // Added for account deletion

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const PLATFORM_NAME = "Computing and Innovation Club of Laikipia University";

export const sendNotificationEmail = async (
  email: string,
  subject: string,
  message: string,
  html?: string,
  type: EmailType = "generic"
): Promise<string> => {
  try {
    // 2. UPDATED: Added account-closure theme
    const themes: Record<EmailType, { color: string; icon: string; label: string }> = {
      welcome:           { color: "#003366", icon: "🎓", label: "WELCOME" },
      credentials:       { color: "#003366", icon: "🔐", label: "ACCESS KEYS" },
      "password-reset":  { color: "#D97706", icon: "🔄", label: "RECOVERY" },
      "password-update": { color: "#059669", icon: "🛡️", label: "SECURITY" },
      "vote-confirmation": { color: "#2563EB", icon: "🗳️", label: "VOTE CAST" },
      alert:             { color: "#DC2626", icon: "⚠️", label: "SECURITY ALERT" },
      generic:           { color: "#003366", icon: "📢", label: "NOTICE" },
      "unlock-code":     { color: "#7C3AED", icon: "🔑", label: "ACCOUNT UNLOCK" },
      "account-closure": { color: "#4B5563", icon: "🚫", label: "ACCOUNT CLOSED" }, // Gray theme for deletion
    };

    const theme = themes[type] || themes.generic;

    const defaultHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container { max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; background-color: #f9fafb; padding: 20px; }
        .card { background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
        .header { background-color: ${theme.color}; padding: 30px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
        .content { padding: 40px 30px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; background-color: ${theme.color}20; color: ${theme.color}; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
        .message { line-height: 1.6; font-size: 15px; color: #374151; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #f3f4f6; }
        .btn-box { margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; text-align: center; }
        .highlight { color: ${theme.color}; font-weight: bold; }
        
        .reset-button {
          display: inline-block;
          background-color: ${theme.color};
          color: #ffffff !important;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 14px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <h1>${PLATFORM_NAME}</h1>
          </div>
          <div class="content">
            <div class="badge">${theme.icon} ${theme.label}</div>
            <div class="message">
              ${message}
            </div>
            <p style="margin-top: 25px; font-size: 13px; color: #6b7280;">
              If you have any issues, please contact the technical team.
            </p>
          </div>
          <div class="footer">
            <strong>Laikipia University</strong><br>
            Computing & Innovation Voting System &copy; ${new Date().getFullYear()}
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"${PLATFORM_NAME}" <${process.env.EMAIL_SENDER}>`,
      to: email,
      subject: `${subject} | LU Voting`,
      html: html || defaultHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    return info.accepted?.length ? "✅ Email sent" : "⚠️ Email not sent";
  } catch (error: any) {
    console.error("Email Error:", error);
    return `❌ Email error: ${error.message}`;
  }
};