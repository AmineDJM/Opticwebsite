import { randomBytes, randomUUID } from "node:crypto";

/**
 * ID and token generation. Order numbers are human-facing and must be readable
 * over the phone (COD support), so they avoid ambiguous characters and encode the
 * date for at-a-glance sorting.
 */

const ORDER_ALPHABET = "ACDEFGHJKLMNPQRSTUVWXYZ2345679"; // no I,O,0,1,B,8

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function uuid(): string {
  return randomUUID();
}

/**
 * Order number like `AUR-260822-K7Q3F`. The prefix is brand-scoped, the middle is
 * yymmdd, the suffix is 5 random unambiguous characters.
 */
export function generateOrderNumber(prefix: string, date: Date = new Date()): string {
  const yy = String(date.getUTCFullYear()).slice(2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  let suffix = "";
  const raw = randomBytes(5);
  for (let i = 0; i < 5; i++) {
    suffix += ORDER_ALPHABET[raw[i]! % ORDER_ALPHABET.length];
  }
  const cleanPrefix =
    prefix
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 4)
      .toUpperCase() || "ORD";
  return `${cleanPrefix}-${yy}${mm}${dd}-${suffix}`;
}

/** Anonymous session key for guest quiz/visagism results (not a security token). */
export function sessionKey(): string {
  return "sk_" + randomBytes(12).toString("hex");
}
