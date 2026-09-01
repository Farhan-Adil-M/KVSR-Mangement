import { requireStudent } from "@/lib/auth/guards";
import { StudentBiometricEnroll } from "@/components/student-biometric-enroll";

export const metadata = {
  title: "My Biometrics - KVSR",
};

export default async function StudentBiometricsPage() {
  const session = await requireStudent();
  return <StudentBiometricEnroll studentId={session.id} />;
}
