import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/guards";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Sign In | KVSR Management",
};

export default async function LoginPage() {
  // Already signed in → go straight to the right portal.
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));

  return <LoginForm />;
}
