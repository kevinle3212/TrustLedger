type MatchMediaListener = (event: MediaQueryListEvent) => void;

class MockMediaQueryList extends EventTarget {
	readonly media: string;
	readonly matches: boolean;
	onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null = null;

	constructor(query: string, matches = false) {
		super();
		this.media = query;
		this.matches = matches;
	}

	addListener(listener: MatchMediaListener): void {
		this.addEventListener("change", listener as EventListener);
	}

	removeListener(listener: MatchMediaListener): void {
		this.removeEventListener("change", listener as EventListener);
	}

	override dispatchEvent(event: Event): boolean {
		if (typeof MediaQueryListEvent !== "undefined" && event instanceof MediaQueryListEvent) {
			this.onchange?.call(this as unknown as MediaQueryList, event);
		}
		return super.dispatchEvent(event);
	}
}

class MockResizeObserver implements ResizeObserver {
	disconnect(): void {}
	observe(_target: Element): void {}
	unobserve(_target: Element): void {}
}

export function installBrowserMocks(): void {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: jest.fn((query: string) => new MockMediaQueryList(query) as MediaQueryList),
	});

	Object.defineProperty(window, "ResizeObserver", {
		configurable: true,
		writable: true,
		value: MockResizeObserver,
	});
}
