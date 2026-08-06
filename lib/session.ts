import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "lorekeeper_session";
const SUPABASE_ACCESS_COOKIE = "lorekeeper_supabase_access";
const SUPABASE_REFRESH_COOKIE = "lorekeeper_supabase_refresh";
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

type SupabaseAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type StoredSupabaseAuthTokens = {
  accessToken?: string;
  refreshToken: string;
};

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  priority: "high" as const,
};

export async function createSession(session: Session, authTokens?: SupabaseAuthTokens) {
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_SECONDS * 1000);
  const token = await new SignJWT({ email: session.email, username: session.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(sessionKey());

  (await cookies()).set(COOKIE_NAME, token, {
    ...authCookieOptions,
    maxAge: SESSION_LENGTH_SECONDS,
    expires: expiresAt,
  });
  if (authTokens) await setSupabaseAuthTokens(authTokens);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionKey(), {
      algorithms: ["HS256"],
      clockTolerance: 5,
    });
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.username !== "string")
      return null;
    return { userId: payload.sub, email: payload.email, username: payload.username };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(SUPABASE_ACCESS_COOKIE);
  cookieStore.delete(SUPABASE_REFRESH_COOKIE);
}

export async function getSupabaseAuthTokens(): Promise<StoredSupabaseAuthTokens | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SUPABASE_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(SUPABASE_REFRESH_COOKIE)?.value;
  // Supabase access tokens expire before the seven-day Lorekeeper session.
  // The refresh token is sufficient to renew the pair, so do not reject an
  // otherwise recoverable session just because its access cookie expired.
  if (!refreshToken) return null;
  return accessToken ? { accessToken, refreshToken } : { refreshToken };
}

export async function setSupabaseAuthTokens(tokens: SupabaseAuthTokens) {
  const cookieStore = await cookies();
  cookieStore.set(SUPABASE_ACCESS_COOKIE, tokens.accessToken, {
    ...authCookieOptions,
    maxAge: 60 * 60,
  });
  cookieStore.set(SUPABASE_REFRESH_COOKIE, tokens.refreshToken, {
    ...authCookieOptions,
    maxAge: SESSION_LENGTH_SECONDS,
  });
}
