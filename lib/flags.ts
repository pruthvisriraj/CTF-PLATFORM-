import { createHash } from "crypto";

/** Normalize a submitted answer: trim, lowercase, collapse whitespace. */
export function normalizeFlag(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

/** SHA-256 hex digest of the normalized flag. Server-side only. */
export function hashFlag(input: string): string {
  return createHash("sha256").update(normalizeFlag(input), "utf8").digest("hex");
}

/** Constant-time comparison of a submitted answer against a stored hash. */
export function checkFlag(answer: string, storedHash: string): boolean {
  const a = Buffer.from(hashFlag(answer), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
