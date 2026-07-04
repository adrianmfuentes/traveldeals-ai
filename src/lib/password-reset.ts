import { randomBytes, createHash } from "crypto";

export const RESET_TOKEN_TTL_MINUTES = 30;

// The raw token goes out in the email link; only its hash is stored, so a
// database read (or backup leak) can't be used to reset anyone's password.
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
