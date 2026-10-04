/**
 * Postgres error classification for friendly constraint messages.
 * neon-http surfaces server errors as NeonDbError (code/constraint fields);
 * drivers may wrap them, so the cause chain is walked.
 */
export function isUniqueViolation(error: unknown, constraintName?: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth++) {
    if (!current || typeof current !== "object") return false;
    const code = (current as { code?: unknown }).code;
    if (code === "23505") {
      if (!constraintName) return true;
      const constraint = (current as { constraint?: unknown }).constraint;
      if (typeof constraint === "string" && constraint === constraintName) {
        return true;
      }
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
