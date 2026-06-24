import "server-only";

/**
 * Framework-agnostic result returned by every controller.
 *
 * Controllers never construct `NextResponse` objects; they return a
 * {@link ControllerResult} that the calling route handler maps to an HTTP
 * response. This keeps controllers unit-testable without the Next.js runtime.
 *
 * @typeParam T - Shape of the success body.
 */
export interface ControllerResult<T> {
	/** HTTP status code the route should respond with. */
	readonly status: number;
	/** Success payload, or an `{ error }` object for non-2xx results. */
	readonly body: T | { readonly error: string };
}

/**
 * Builds a successful {@link ControllerResult}.
 *
 * @typeParam T - Shape of the success body.
 * @param body - Success payload to return.
 * @param status - HTTP status code (defaults to `200`).
 * @returns A controller result carrying `body` and `status`.
 */
export function ok<T>(body: T, status = 200): ControllerResult<T> {
	return { status, body };
}

/**
 * Builds an error {@link ControllerResult}.
 *
 * @param message - Machine-readable error code (for example `"unauthorized"`).
 * @param status - HTTP status code (defaults to `400`).
 * @returns A controller result carrying `{ error: message }` and `status`.
 */
export function fail(message: string, status = 400): ControllerResult<never> {
	return { status, body: { error: message } };
}
