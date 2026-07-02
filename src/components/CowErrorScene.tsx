/**
 * Shared animated scene for every branded error surface (400, 401, 403, 404,
 * 405, 408, 429, 500, 502, 503, 504, maintenance, and the runtime error
 * boundary). A cartoon cow walks in from the left, teeters at the edge of a
 * hole, and drops in on a loop — a light-hearted stand-in for "this path went
 * nowhere". Purely presentational (`aria-hidden`); the surrounding heading, body
 * copy, and recovery links carry all meaning for assistive tech. Every animated
 * layer is frozen under `prefers-reduced-motion` (see `globals.scss`), leaving
 * the cow standing beside the hole. Transform-only animation, so it never causes
 * layout shift.
 */
export function CowErrorScene(): React.JSX.Element {
	return (
		<svg viewBox="0 0 240 220" role="img" aria-hidden="true" className="h-auto w-full max-w-72">
			{/* Ground */}
			<line
				x1="16"
				y1="168"
				x2="224"
				y2="168"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				className="text-gray-300 dark:text-white/20"
			/>
			{/* Hole */}
			<ellipse
				cx="120"
				cy="172"
				rx="52"
				ry="15"
				className="tl-cow-hole fill-gray-900/85 dark:fill-black"
			/>
			<ellipse cx="120" cy="170" rx="40" ry="10" className="fill-gray-950 dark:fill-black" />
			{/* Dust puffs kicked up as the cow drops in */}
			<g className="tl-cow-dust text-gray-400 dark:text-white/40">
				<circle cx="92" cy="160" r="5" fill="currentColor" />
				<circle cx="148" cy="158" r="6" fill="currentColor" />
				<circle cx="120" cy="150" r="4" fill="currentColor" />
			</g>
			{/* Cow: the walker group carries the walk-in + fall; the legs group adds a
			    gait step so the cow reads as walking before it tips into the hole. */}
			<g className="tl-cow-walker">
				{/* Legs */}
				<g
					className="tl-cow-legs stroke-gray-900 dark:stroke-gray-100"
					strokeWidth="7"
					strokeLinecap="round"
				>
					<line x1="96" y1="128" x2="96" y2="150" />
					<line x1="112" y1="130" x2="112" y2="152" />
					<line x1="132" y1="130" x2="132" y2="152" />
					<line x1="148" y1="128" x2="148" y2="150" />
				</g>
				{/* Body */}
				<rect
					x="84"
					y="96"
					width="80"
					height="42"
					rx="21"
					className="fill-white stroke-gray-900 dark:fill-gray-100 dark:stroke-gray-900"
					strokeWidth="3"
				/>
				{/* Spots */}
				<ellipse
					cx="108"
					cy="112"
					rx="9"
					ry="7"
					className="fill-gray-900 dark:fill-gray-800"
				/>
				<ellipse
					cx="140"
					cy="120"
					rx="7"
					ry="6"
					className="fill-gray-900 dark:fill-gray-800"
				/>
				{/* Tail */}
				<path
					d="M164 104c10 2 14 10 12 22"
					fill="none"
					className="stroke-gray-900 dark:stroke-gray-100"
					strokeWidth="3"
					strokeLinecap="round"
				/>
				{/* Head */}
				<g>
					<rect
						x="60"
						y="92"
						width="38"
						height="34"
						rx="15"
						className="fill-white stroke-gray-900 dark:fill-gray-100 dark:stroke-gray-900"
						strokeWidth="3"
					/>
					{/* Snout */}
					<rect
						x="56"
						y="106"
						width="20"
						height="18"
						rx="9"
						className="fill-pink-200 stroke-gray-900 dark:stroke-gray-900"
						strokeWidth="2.5"
					/>
					<circle cx="62" cy="115" r="1.8" className="fill-gray-900" />
					<circle cx="70" cy="115" r="1.8" className="fill-gray-900" />
					{/* Eye */}
					<circle cx="80" cy="103" r="2.6" className="fill-gray-900" />
					{/* Ear */}
					<path
						d="M92 90c8-4 14-2 16 4"
						fill="none"
						className="stroke-gray-900 dark:stroke-gray-100"
						strokeWidth="3"
						strokeLinecap="round"
					/>
					{/* Horns */}
					<path
						d="M74 92c-1-6 1-9 4-10"
						fill="none"
						className="stroke-gray-900 dark:stroke-gray-100"
						strokeWidth="3"
						strokeLinecap="round"
					/>
				</g>
			</g>
		</svg>
	);
}
