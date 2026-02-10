import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// JWT payload type - aligned with your actual role logic
type DecodedToken = {
  userId: string;
  regNo: string;
  role: 'admin' | 'member'; // Simplified to match your pgEnum bottom line
  name: string;
  exp: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export const verifyToken = async (token: string, secret: string): Promise<DecodedToken | null> => {
  try {
    return jwt.verify(token, secret) as DecodedToken;
  } catch (error) {
    return null;
  }
};

export const authMiddleware = (allowedRoles: string[] | "any" = "any") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const decodedToken = await verifyToken(token, process.env.JWT_SECRET!);
    if (!decodedToken) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Role Check
    if (allowedRoles === "any" || allowedRoles.includes(decodedToken.role)) {
      req.user = decodedToken;
      return next();
    }

    return res.status(403).json({ error: "Access forbidden: insufficient permissions" });
  };
};

// Simplified role-specific exports
export const adminAuth = authMiddleware(["admin"]);
export const memberAuth = authMiddleware(["member"]);
export const anyAuthenticatedUser = authMiddleware("any");