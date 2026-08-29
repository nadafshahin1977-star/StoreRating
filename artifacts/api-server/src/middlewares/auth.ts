import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";

import { db, users, type User } from "@workspace/db";
import { verifyToken } from "../lib/security";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const payload = verifyToken(header.slice(7));
    return db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)
      .then(([user]) => {
        if (!user) {
          return res.status(401).json({ success: false, message: "Session user not found" });
        }
        req.user = user;
        return next();
      })
      .catch(next);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

export function requireRole(...roles: User["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission to access this resource" });
    }
    return next();
  };
}