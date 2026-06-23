/**
 * Analytics service.
 *
 * Fans domain events out to a pluggable {@link AnalyticsSink}. Disabled via
 * {@link config.analyticsEnabled}; mirrors every tracked event onto the core
 * {@link eventBus} so other subscribers (telemetry, debug overlays) can react.
 */

import { config } from "@/core/config";
import type { AnalyticsEvent, AnalyticsSink } from "@/core/contracts";
import { eventBus } from "@/core/events";
import { logger } from "@/core/logging";

/** Posts events to the analytics HTTP endpoint with `sendBeacon` when possible. */
export const httpSink: AnalyticsSink = {
	send(event: AnalyticsEvent): void {
		const body = JSON.stringify(event);
		if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
			navigator.sendBeacon(config.analyticsEndpoint, body);
			return;
		}
		if (typeof fetch === "function") {
			void fetch(config.analyticsEndpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body,
				keepalive: true,
			}).catch((error: unknown) => {
				logger.warn("analytics:send-failed", { error: String(error) });
			});
		}
	},
};

/** Buffers events in memory — used by tests and the debug surface. */
export class BufferSink implements AnalyticsSink {
	public readonly events: AnalyticsEvent[] = [];
	public send(event: AnalyticsEvent): void {
		this.events.push(event);
	}
}

/** Tracks analytics events through a sink. */
export class AnalyticsService {
	public constructor(private readonly sink: AnalyticsSink) {}

	public track(name: string, properties?: Record<string, unknown>): void {
		if (!config.analyticsEnabled) return;
		const event: AnalyticsEvent = { name, properties, timestamp: Date.now() };
		eventBus.emit("analytics:track", { name, properties });
		try {
			void this.sink.send(event);
		} catch (error: unknown) {
			logger.warn("analytics:track-failed", { name, error: String(error) });
		}
	}
}

/** Application analytics service (HTTP-backed). */
export const analytics = new AnalyticsService(httpSink);
