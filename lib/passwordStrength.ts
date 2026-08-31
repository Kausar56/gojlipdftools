const MIN_LENGTH = 6;

export type PasswordStrengthLabel = "Minimum Character" | "Low" | "Good" | "Strong";

export interface PasswordStrength {
  label: PasswordStrengthLabel;
  score: 1 | 2 | 3 | 4;
  colorClass: string;
}

/** Simple length + character-variety heuristic — good enough for guiding a
 *  user toward a stronger password, not a substitute for real breach-list
 *  checking. Returns null for an empty password (nothing to show yet). */
export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  if (password.length < MIN_LENGTH) {
    return { label: "Minimum Character", score: 1, colorClass: "bg-error" };
  }

  let variety = 0;
  if (/[a-z]/.test(password)) variety++;
  if (/[A-Z]/.test(password)) variety++;
  if (/[0-9]/.test(password)) variety++;
  if (/[^a-zA-Z0-9]/.test(password)) variety++;

  if (password.length >= 10 && variety >= 3) {
    return { label: "Strong", score: 4, colorClass: "bg-success" };
  }
  if (password.length >= 8 && variety >= 2) {
    return { label: "Good", score: 3, colorClass: "bg-info" };
  }
  return { label: "Low", score: 2, colorClass: "bg-warning" };
}
