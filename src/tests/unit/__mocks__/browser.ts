type MatchMediaListener = (event: MediaQueryListEvent) => void;

class MockMediaQueryList extends EventTarget implements MediaQueryList {
	public readonly media: string;
	public readonly matches: boolean;
	public onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null = null;

	public constructor(query: string, matches = false) {
		super();
		this.media = query;
		this.matches = matches;
	}

	public addListener(listener: MatchMediaListener): void {
		this.addEventListener("change", listener as EventListener);
	}

	public removeListener(listener: MatchMediaListener): void {
		this.removeEventListener("change", listener as EventListener);
	}

	public override dispatchEvent(event: Event): boolean {
		if (typeof MediaQueryListEvent !== "undefined" && event instanceof MediaQueryListEvent) {
			this.onchange?.call(this, event);
		}
		return super.dispatchEvent(event);
	}
}

class MockResizeObserver implements ResizeObserver {
	public disconnect(): void {
		return undefined;
	}

	public observe(target: Element): void {
		void target;
	}

	public unobserve(target: Element): void {
		void target;
	}
}

export function installBrowserMocks(): void {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: jest.fn((query: string) => new MockMediaQueryList(query)),
	});

	Object.defineProperty(window, "ResizeObserver", {
		configurable: true,
		writable: true,
		value: MockResizeObserver,
	});
}
