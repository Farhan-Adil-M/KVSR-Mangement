"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Lock, User, GraduationCap, BookOpen, ArrowRight } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { LogoAnimation } from "@/components/logo-animation";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  faculty: "/faculty/dashboard",
  student: "/student/dashboard",
};

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<"faculty" | "student">("faculty");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(username, password, role);

    setIsLoading(false);

    if (result.success) {
      router.push(ROLE_HOME[result.user.role] ?? "/login");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-kvsr-deep flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[60vw] h-[60vw] rounded-full bg-kvsr-cta/10 blur-[120px] -translate-y-1/3 translate-x-1/4" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoAnimation size={80} variant="hero" />
          </div>
          <h1 className="text-2xl font-semibold text-white">KVSR Management</h1>
          <p className="text-sm text-kvsr-muted mt-1">
            Sign in to access your portal
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-2 p-1 bg-kvsr-navy/[0.04] rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setRole("faculty")}
              aria-pressed={role === "faculty"}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === "faculty"
                  ? "bg-white text-kvsr-ink shadow-sm"
                  : "text-muted-foreground hover:text-kvsr-ink"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Faculty
            </button>
            <button
              type="button"
              onClick={() => setRole("student")}
              aria-pressed={role === "student"}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === "student"
                  ? "bg-white text-kvsr-ink shadow-sm"
                  : "text-muted-foreground hover:text-kvsr-ink"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
              >
                {role === "faculty" ? "Username" : "Roll Number"}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={role === "faculty" ? "faculty.username" : "21B01A0501"}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-kvsr-cta text-white font-medium rounded-xl hover:bg-kvsr-cta/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
