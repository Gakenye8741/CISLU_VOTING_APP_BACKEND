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
    
    // Clean "Bearer " prefix and strip accidental quotes/backslashes
    let token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    if (token) {
      token = token.replace(/[\\"]/g, '').trim(); 
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decodedToken = await verifyToken(token, process.env.JWT_SECRET!);
    if (!decodedToken) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach to request
    req.user = decodedToken;

    if (allowedRoles === "any" || allowedRoles.includes(decodedToken.role)) {
      return next();
    }

    return res.status(403).json({ error: "Access forbidden" });
  };
};

// Simplified role-specific exports
export const adminAuth = authMiddleware(["admin"]);
export const memberAuth = authMiddleware(["member"]);
export const anyAuthenticatedUser = authMiddleware("any");