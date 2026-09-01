"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaceCamera, type FaceCameraHandle } from "@/components/face-camera";
import { identifyByFace, loginByIdentified } from "@/lib/actions/identify";
import { login } from "@/lib/actions/auth";
import { User, GraduationCap, BookOpen, Lock, ScanFace } from "lucide-react";

const SCAN_INTERVAL_MS = 1500;

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

  const scanningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ready || matched) return;
    let cancelled = false;
    scanningRef.current = true;
    setStatus("Looking for your face…");
    intervalRef.current = setInterval(async () => {
      if (cancelled || matched) return;
      const descriptors = await camRef.current?.capture();
      if (!descriptors || descriptors.length === 0) {
        setStatus("No face detected. Position yourself in frame.");
        return;
      }
      const result = await identifyByFace(descriptors[0]);
      if (cancelled) return;
      if (result.ok) {
        setMatched(result.user.name);
        setStatus("Welcome " + result.user.name + " — signing you in…");
        scanningRef.current = false;
        if (intervalRef.current) clearInterval(intervalRef.current);
        await loginByIdentified(result.user);
      } else {
        setStatus("Face not recognized. Try again or use credentials below.");
      }
    }, SCAN_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      scanningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, matched]);

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
    <div className="min-h-screen bg-kvsr-deep flex items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-white">KVSR Management</h1>
          <p className="text-sm text-kvsr-muted mt-1">
            {matched ? "Signed in" : "Look at the camera to sign in"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="relative overflow-hidden rounded-xl bg-black aspect-video mb-4">
            <FaceCamera ref={camRef} onStatus={setStatus} onReady={() => setReady(true)} />
            <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 text-white text-xs font-semibold backdrop-blur-sm">
              <ScanFace className="w-4 h-4" />
              {ready ? "Scanning" : "Starting"}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">{status}</p>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowFallback((s) => !s)}
              className="text-sm text-kvsr-cta hover:underline"
            >
              {showFallback ? "Use face camera instead" : "Sign in with username & password"}
            </button>
          </div>

          {showFallback && (
            <form onSubmit={handleFallback} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 p-1 bg-kvsr-navy/[0.04] rounded-xl">
                {(["admin", "faculty", "student"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      role === r
                        ? "bg-white text-kvsr-ink shadow-sm"
                        : "text-muted-foreground hover:text-kvsr-ink"
                    }`}
                  >
                    {r === "admin" && <Lock className="w-3.5 h-3.5" />}
                    {r === "faculty" && <BookOpen className="w-3.5 h-3.5" />}
                    {r === "student" && <GraduationCap className="w-3.5 h-3.5" />}
                    {r[0].toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {role === "student" ? "Roll Number" : "Username"}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={role === "student" ? "21B01A0501" : role === "admin" ? "admin" : "faculty.username"}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
                  required
                />
              </div>

              {fbError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm" role="alert">
                  {fbError}
                </div>
              )}

              <button
                type="submit"
                disabled={fbLoading}
                className="w-full px-6 py-2.5 bg-kvsr-cta text-white font-medium rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50"
              >
                {fbLoading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
