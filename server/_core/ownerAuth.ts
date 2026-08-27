import { timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";

export const OWNER_SESSION_COOKIE = "luxora_owner_session";
const OWNER_OPEN_ID = "luxora-owner";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 12;

function getSecret(secret = ENV.cookieSecret) {
  if (!secret) throw new Error("JWT_SECRET is required for standalone owner authentication");
  return new TextEncoder().encode(secret);
}

export function isStandaloneOwnerAuthEnabled() {
  return Boolean(ENV.standaloneAdminPassword);
}

export function verifyOwnerPassword(candidate: string, expected = ENV.standaloneAdminPassword) {
  if (!candidate || !expected) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export async function createOwnerSession(secret?: string) {
  return new SignJWT({ role: "admin", name: "LUXORA Owner" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(OWNER_OPEN_ID)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS)
    .sign(getSecret(secret));
}

export async function authenticateOwnerRequest(req: Request, secret?: string): Promise<User | null> {
  const token = parseCookieHeader(req.headers.cookie ?? "")[OWNER_SESSION_COOKIE];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(secret), { algorithms: ["HS256"] });
    if (payload.sub !== OWNER_OPEN_ID || payload.role !== "admin") return null;

    const now = new Date();
    return {
      id: 0,
      openId: OWNER_OPEN_ID,
      name: "LUXORA Owner",
      email: null,
      loginMethod: "owner-password",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
  } catch {
    return null;
  }
}
