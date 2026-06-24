/**
 * Typed error hierarchy and normalisation helpers.
 *
 * Every expected failure in the app should be (or normalise to) an
 * {@link AppError} so call sites can branch on `code` and surface a safe
 * `message` without leaking internals.
 */

/** Machine-readable error codes. */
export type ErrorCode =
	| "VALIDATION"
	| "NOT_FOUND"
	| "PERMISSION"
	| "NETWORK"
	| "CONFLICT"
	| "INTERNAL";

/** Base class for all application errors. */
export class AppError extends Error {
	public readonly code: ErrorCode;
	public readonly context?: Record<string, unknown> | undefined;
	public override readonly cause?: unknown;

	public constructor(
		code: ErrorCode,
		message: string,
		options?: { context?: Record<string, unknown> | undefined; cause?: unknown },
	) {
		super(message);
		this.name = new.target.name;
		this.code = code;
		this.context = options?.context;
		this.cause = options?.cause;
	}

	/** Serialisable, client-safe shape. */
	public toJSON(): {
		code: ErrorCode;
		message: string;
		context?: Record<string, unknown> | undefined;
	} {
		return { code: this.code, message: this.message, context: this.context };
	}
}

/** Thrown when user-supplied input fails a validation check. Maps to HTTP 422. */
export class ValidationError extends AppError {
	public constructor(message: string, context?: Record<string, unknown>) {
		super("VALIDATION", message, { context });
	}
}

/** Thrown when a requested resource does not exist. Maps to HTTP 404. */
export class NotFoundError extends AppError {
	public constructor(message: string, context?: Record<string, unknown>) {
		super("NOT_FOUND", message, { context });
	}
}

/** Thrown when the caller lacks permission to perform an action. Maps to HTTP 403. */
export class PermissionError extends AppError {
	public constructor(message: string, context?: Record<string, unknown>) {
		super("PERMISSION", message, { context });
	}
}

/** Thrown when an outbound network request fails or times out. Maps to HTTP 502/503. */
export class NetworkError extends AppError {
	public constructor(
		message: string,
		options?: { context?: Record<string, unknown>; cause?: unknown },
	) {
		super("NETWORK", message, options);
	}
}

/** Type guard for {@link AppError}. */
export function isAppError(value: unknown): value is AppError {
	return value instanceof AppError;
}

/** Coerce any thrown value into an {@link AppError}. */
export function normalizeError(value: unknown): AppError {
	if (isAppError(value)) return value;
	if (value instanceof Error) {
		return new AppError("INTERNAL", value.message, { cause: value });
	}
	if (typeof value === "string") {
		return new AppError("INTERNAL", value);
	}
	return new AppError("INTERNAL", "Unknown error", { cause: value });
}
