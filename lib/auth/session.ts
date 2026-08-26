import { cookies } from "next/headers";

const COOKIE_NAME = "kvsr_session";
const SESSION_DAYS = 7;

// Fail closed: never fall back to a known constant (forgeable sessions).
const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  throw new Error("SESSION_SECRET must be set in the environment.");
}

export interface SessionUser {
  id: string;
  name: string;
  role: "admin" | "faculty" | "student";
  /** Unix seconds — session expiry, enforced on every verify. */
  exp: number;
}

export function createSessionPayload(user: Omit<SessionUser, "exp">): SessionUser {
  return { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60 };
}

async function getKey() {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(value: string): Promise<string> {
  const key = await getKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const signatureBase64 = Buffer.from(signature).toString("base64url");
  return `${value}.${signatureBase64}`;
}

async function verify(signedValue: string): Promise<string | null> {
  const lastDot = signedValue.lastIndexOf(".");
  if (lastDot === -1) return null;

  const value = signedValue.slice(0, lastDot);
  const signatureBase64 = signedValue.slice(lastDot + 1);

  try {
    const key = await getKey();
    const encoder = new TextEncoder();
    const signature = Buffer.from(signatureBase64, "base64url");
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(value)
    );
    return valid ? value : null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  const value = await verify(sessionCookie.value);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as SessionUser;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(user: Omit<SessionUser, "exp">) {
  const cookieStore = await cookies();
  const value = JSON.stringify(createSessionPayload(user));
  const signed = await sign(value);

  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
