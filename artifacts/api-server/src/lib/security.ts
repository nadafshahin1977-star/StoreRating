import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import type { User } from "@workspace/db";

export type SessionUser = Pick<User, "id" | "name" | "email" | "address" | "role" | "createdAt">;

const JWT_SECRET = process.env.SESSION_SECRET ?? "store-rate-development-secret";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createToken(user: SessionUser) {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: number; role: User["role"] };
}

export function publicUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address,
    role: user.role,
    createdAt: user.createdAt,
  };
}