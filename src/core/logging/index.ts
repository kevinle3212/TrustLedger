/**
 * Structured logger.
 *
 * Level-gated by {@link config.logLevel}, writes to the console by default, and
 * supports `child()` to bind shared context (e.g. a request id). A custom sink
 * can be installed in tests or to forward logs to an external collector.
 */

import { config } from "@/core/config";
import type { Logger, LogContext, LogLevel } from "@/core/contracts";

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** A log line ready to be written somewhere. */
export interface LogRecord {
	readonly level: LogLevel;
	readonly message: string;
	readonly context?: LogContext | undefined;
	readonly timestamp: number;
}

/** Receives fully-formed log records. */
export type LogSink = (record: LogRecord) => void;

const consoleSink: LogSink = (record) => {
	const payload = record.context ?? "";
	// eslint-disable-next-line no-console -- the console sink is the one allowed console use.
	const target = console[record.level === "debug" ? "log" : record.level];
	if (payload === "") {
		target(`[${record.level}] ${record.message}`);
	} else {
		target(`[${record.level}] ${record.message}`, payload);
	}
};

let activeSink: LogSink = consoleSink;

/** Replace the global sink (e.g. to buffer logs in a test). */
export function setLogSink(sink: LogSink): void {
	activeSink = sink;
}

/** Restore the default console sink. */
export function resetLogSink(): void {
	activeSink = consoleSink;
}

function emit(
	level: LogLevel,
	baseContext: LogContext,
	message: string,
	context?: LogContext,
): void {
	if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[config.logLevel]) return;
	const merged =
		Object.keys(baseContext).length === 0 && context === undefined
			? undefined
			: { ...baseContext, ...context };
	activeSink({ level, message, context: merged, timestamp: Date.now() });
}

function createLogger(baseContext: LogContext): Logger {
	return {
		debug: (message, context): void => {
			emit("debug", baseContext, message, context);
		},
		info: (message, context): void => {
			emit("info", baseContext, message, context);
		},
		warn: (message, context): void => {
			emit("warn", baseContext, message, context);
		},
		error: (message, context): void => {
			emit("error", baseContext, message, context);
		},
		child: (context): Logger => createLogger({ ...baseContext, ...context }),
	};
}

/** The application-wide logger. Use `logger.child({ … })` for scoped context. */
export const logger: Logger = createLogger({});
