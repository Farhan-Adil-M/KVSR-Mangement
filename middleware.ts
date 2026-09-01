import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "kvsr_session";
// Fail closed: never fall back to a known constant (forgeable sessions).
const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  throw new Error("SESSION_SECRET must be set in the environment.");
}

interface SessionPayload {
  id: string;
  name: string;
  role: "admin" | "hod" | "faculty" | "student";
  exp: number;
}

const ROLE_PREFIX: Record<SessionPayload["role"], string> = {
  admin: "/admin",
  hod: "/faculty",
  faculty: "/faculty",
  student: "/student",
};

const ROLE_HOME: Record<SessionPayload["role"], string> = {
  admin: "/admin/dashboard",
  hod: "/faculty/dashboard",
  faculty: "/faculty/dashboard",
  student: "/student/dashboard",
};

async function getKey() {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function verifySession(cookieValue: string): Promise<SessionPayload | null> {
  const lastDot = cookieValue.lastIndexOf(".");
  if (lastDot === -1) return null;

  const value = cookieValue.slice(0, lastDot);
  const signatureBase64 = cookieValue.slice(lastDot + 1);

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
    if (!valid) return null;
    const parsed = JSON.parse(value) as SessionPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.next();
  }

  const isPortalRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/faculty") ||
    pathname.startsWith("/student");

  if (isPortalRoute) {
    const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
    const session = sessionCookie ? await verifySession(sessionCookie) : null;

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Role-prefix enforcement: /admin/* admin-only, /faculty/* faculty-only, /student/* student-only
    const allowedPrefix = ROLE_PREFIX[session.role];
    if (!pathname.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
    }

    // Bare portal roots redirect to the role home
    if (pathname === "/admin" || pathname === "/faculty" || pathname === "/student") {
      return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // NOTE: /api is excluded — if API routes are ever added, they MUST enforce
  // auth server-side (guards) because middleware does not cover them.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|College_logo.jpg|sw.js|swe-worker).*)",
  ],
};
