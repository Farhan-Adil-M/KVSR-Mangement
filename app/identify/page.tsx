"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaceCamera, type FaceCameraHandle } from "@/components/face-camera";
import { identifyByFace, loginByIdentified } from "@/lib/actions/identify";
import { login } from "@/lib/actions/auth";
import {
  User,
  GraduationCap,
  BookOpen,
  Lock,
  ScanFace,
  ChevronDown,
} from "lucide-react";

const SCAN_INTERVAL_MS = 1200;

export default function IdentifyPage() {
  const router = useRouter();
  const camRef = useRef<FaceCameraHandle>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Starting camera…");
  const [matched, setMatched] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Credential fallback state
  const [role, setRole] = useState<"admin" | "faculty" | "student">("faculty");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbLoading, setFbLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMatchRef = useRef<string | null>(null);
  const matchedRef = useRef(false);

  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    if (!matchedRef.current) {
      setStatus("Scanning for your face…");
    }
    intervalRef.current = setInterval(async () => {
      if (cancelled || matchedRef.current) return;
      const descriptors = await camRef.current?.capture();
      if (!descriptors || descriptors.length === 0) {
        // Keep scanning silently — never spam the status.
        lastMatchRef.current = null;
        return;
      }
      const result = await identifyByFace(descriptors[0]);
      if (cancelled) return;
      if (result.ok) {
        // Require the SAME student on two consecutive scans to avoid a
        // false positive stopping the flow on the first frame.
        if (lastMatchRef.current === result.user.id) {
          matchedRef.current = true;
          setMatched(result.user.name);
          setStatus("Welcome " + result.user.name + " — signing you in…");
          if (intervalRef.current) clearInterval(intervalRef.current);
          await loginByIdentified(result.user);
        } else {
          lastMatchRef.current = result.user.id;
          setStatus("Hold still — confirming…");
        }
      } else {
        lastMatchRef.current = null;
        if (!matchedRef.current && !cancelled) {
          // Only show the gentle hint once, not every scan.
          setStatus((s) =>
            s === "Scanning for your face…" || s === "No face matched yet — keep looking at the camera."
              ? "No face matched yet — keep looking at the camera."
              : s
          );
        }
      }
    }, SCAN_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ready]);

  async function handleFallback(e: React.FormEvent) {
    e.preventDefault();
    setFbError(null);
    setFbLoading(true);
    const res = await login(username, password, role);
    setFbLoading(false);
    if (res.success) {
      router.push(
        role === "admin"
          ? "/admin/dashboard"
          : role === "student"
          ? "/student/dashboard"
          : "/faculty/dashboard"
      );
      router.refresh();
    } else {
      setFbError(res.error);
    }
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Fullscreen camera */}
      <FaceCamera ref={camRef} onReady={onReady} fullscreen />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
          <ScanFace className="w-4 h-4 text-kvsr-gold" />
          <span className="text-white text-sm font-semibold tracking-wide">KVSR</span>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white/90 text-xs font-medium">
          {matched ? "Signed in" : "Face sign-in"}
        </span>
      </div>

      {/* Bottom sheet */}
      <div className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-white p-5 pb-8 space-y-4 shadow-[0_-8px_40px_rgba(0,0,0,0.35)]">
        <div className="mx-auto w-10 h-1 rounded-full bg-kvsr-soft" />

        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-kvsr-ink">
            {matched ? `Welcome, ${matched}` : "Sign in with your face"}
          </h1>
          <p className="text-sm text-slate-700">{status}</p>
        </div>

        {!matched && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-kvsr-cta opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-kvsr-cta" />
            </span>
            Camera stays on while this screen is open
          </div>
        )}

        {!showFallback ? (
          <button
            type="button"
            onClick={() => setShowFallback(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-kvsr-navy/[0.05] text-sm font-semibold text-kvsr-ink hover:bg-kvsr-navy/[0.09] transition-colors min-h-[48px]"
          >
            <ChevronDown className="w-4 h-4" />
            Use username &amp; password instead
          </button>
        ) : (
          <form onSubmit={handleFallback} className="space-y-3">
            <div className="grid grid-cols-3 gap-2 p-1 bg-kvsr-navy/[0.04] rounded-xl">
              {(["admin", "faculty", "student"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    role === r
                      ? "bg-white text-kvsr-ink shadow-sm"
                      : "text-slate-700 hover:text-kvsr-ink"
                  }`}
                >
                  {r === "admin" && <Lock className="w-3.5 h-3.5" />}
                  {r === "faculty" && <BookOpen className="w-3.5 h-3.5" />}
                  {r === "student" && <GraduationCap className="w-3.5 h-3.5" />}
                  {r[0].toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === "student" ? "Roll number" : role === "admin" ? "Admin username" : "Faculty username"}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
                required
              />
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
              required
            />

            {fbError && (
              <p className="text-sm text-red-600" role="alert">
                {fbError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={fbLoading}
                className="flex-1 px-5 py-3 bg-kvsr-cta text-white text-sm font-semibold rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 min-h-[48px]"
              >
                {fbLoading ? "Signing in…" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => setShowFallback(false)}
                className="px-4 py-3 rounded-xl border border-kvsr-soft text-sm font-medium text-slate-700 min-h-[48px]"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
