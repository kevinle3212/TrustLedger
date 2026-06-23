/**
 * Tiny typed event bus (synchronous pub/sub).
 *
 * Decouples producers from consumers — e.g. the analytics service subscribes to
 * domain events rather than being called directly from every component.
 */

/** Domain events emitted across the app, keyed by name → payload type. */
export interface AppEventMap {
	"wallet:connected": { address: string; connector?: string };
	"wallet:disconnected": Record<string, never>;
	"contract:created": { id: string; asset: string };
	"stake:created": { asset: string; amount: string };
	"stake:withdrawn": { asset: string; amount: string };
	"analytics:track": { name: string; properties?: Record<string, unknown> | undefined };
}

export type AppEventName = keyof AppEventMap;
type Handler<E extends AppEventName> = (payload: AppEventMap[E]) => void;

/** A typed in-process event emitter. */
export class EventBus {
	private readonly handlers = new Map<AppEventName, Set<Handler<AppEventName>>>();

	/** Subscribe. Returns an unsubscribe function. */
	public on<E extends AppEventName>(event: E, handler: Handler<E>): () => void {
		const set = this.handlers.get(event) ?? new Set();
		set.add(handler as Handler<AppEventName>);
		this.handlers.set(event, set);
		return (): void => {
			this.off(event, handler);
		};
	}

	/** Subscribe for a single emission. */
	public once<E extends AppEventName>(event: E, handler: Handler<E>): () => void {
		const off = this.on(event, (payload) => {
			off();
			handler(payload);
		});
		return off;
	}

	/** Unsubscribe a previously registered handler. */
	public off<E extends AppEventName>(event: E, handler: Handler<E>): void {
		this.handlers.get(event)?.delete(handler as Handler<AppEventName>);
	}

	/** Emit synchronously. A throwing handler never blocks the others. */
	public emit<E extends AppEventName>(event: E, payload: AppEventMap[E]): void {
		const set = this.handlers.get(event);
		if (set === undefined) return;
		for (const handler of [...set]) {
			try {
				(handler as Handler<E>)(payload);
			} catch {
				// A misbehaving subscriber must not break the publisher or siblings.
			}
		}
	}
}

/** Shared application event bus. */
export const eventBus = new EventBus();
