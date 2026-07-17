import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "lorekeeper_session";
const SESSION_LENGTH_SECONDS = 60 * 60 * 24 * 7;

export type Session = {
  userId: string;
  email: string;
  username: string;
};

function sessionKey() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(session: Session) {
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_SECONDS * 1000);
  const token = await new SignJWT({ email: session.email, username: session.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(sessionKey());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_LENGTH_SECONDS,
    expires: expiresAt,
    priority: "high",
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionKey(), {
      algorithms: ["HS256"],
      clockTolerance: 5,
    });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.username !== "string") return null;
    return { userId: payload.sub, email: payload.email, username: payload.username };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}
