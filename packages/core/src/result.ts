/**
 * A tiny Result type for domain operations that can fail in expected ways
 * (validation, business-rule violations). Throwing is reserved for programmer
 * error and genuinely exceptional conditions.
 */

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.ok;
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return !r.ok;
}

export function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  throw r.error instanceof Error ? r.error : new Error(String(r.error));
}

export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "OUT_OF_STOCK"
  | "RATE_LIMITED"
  | "PAYMENT_ERROR"
  | "INTERNAL";

/** Application error carrying a machine-readable code and optional field details. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, string>;
  readonly httpStatus: number;

  constructor(code: ErrorCode, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    this.httpStatus = HTTP_STATUS[code];
  }

  toJSON() {
    return { code: this.code, message: this.message, details: this.details };
  }
}

const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION: 422,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  OUT_OF_STOCK: 409,
  RATE_LIMITED: 429,
  PAYMENT_ERROR: 402,
  INTERNAL: 500,
};

export const errors = {
  validation: (message: string, details?: Record<string, string>) =>
    new AppError("VALIDATION", message, details),
  notFound: (what = "Resource") => new AppError("NOT_FOUND", `${what} not found`),
  unauthorized: (message = "Authentication required") =>
    new AppError("UNAUTHORIZED", message),
  forbidden: (message = "You do not have permission to do that") =>
    new AppError("FORBIDDEN", message),
  conflict: (message: string) => new AppError("CONFLICT", message),
  outOfStock: (message = "Insufficient stock") => new AppError("OUT_OF_STOCK", message),
  rateLimited: (message = "Too many requests") => new AppError("RATE_LIMITED", message),
  internal: (message = "Something went wrong") => new AppError("INTERNAL", message),
};
