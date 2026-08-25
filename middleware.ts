import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "kvsr_session";
const SECRET = process.env.SESSION_SECRET || "kvsr-dev-secret-change-in-production";

interface SessionUser {
  id: string;
  name: string;
  role: "admin" | "faculty" | "student";
}

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

async function verifySession(cookieValue: string): Promise<SessionUser | null> {
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
    return JSON.parse(value) as SessionUser;
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

  // Protected dashboard routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/timetable") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/students") ||
    pathname.startsWith("/faculty") ||
    pathname.startsWith("/settings")
  ) {
    const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
    const session = sessionCookie ? await verifySession(sessionCookie) : null;

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Student role restrictions
    if (session.role === "student") {
      // Students can only access dashboard and their own attendance/students view
      const allowedPaths = ["/dashboard", "/attendance/reports", "/students"];
      const isAllowed = allowedPaths.some((path) => pathname === path || pathname.startsWith(path));
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|College_logo.jpg).*)",
  ],
};
