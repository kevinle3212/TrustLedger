"use client";

import { useEffect } from "react";

/**
 * Root error boundary. Next.js renders this only when the root layout itself
 * fails, so it runs *outside* the locale layout — no `NextIntlClientProvider`,
 * no global stylesheet, no Navbar/Footer. It must therefore render its own
 * `<html>`/`<body>` and is intentionally self-contained: hardcoded English copy
 * and inline styles, so it stays branded even when the styled app shell is the
 * thing that broke. This replaces the unbranded Vercel/Next default 500 screen.
 *
 * @param error - The thrown error (with an optional digest) surfaced by Next.js.
 * @param reset - Re-attempts rendering the root.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}): React.JSX.Element {
	useEffect(() => {
		console.error("[TrustLedger] global error boundary:", error);
	}, [error]);

	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "2rem",
					backgroundColor: "#030712",
					color: "#f9fafb",
					fontFamily:
						'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
				}}
			>
				<main style={{ maxWidth: "32rem", textAlign: "center" }}>
					<p
						style={{
							margin: 0,
							fontSize: "0.875rem",
							fontWeight: 600,
							letterSpacing: "0.01em",
							color: "#a5b4fc",
						}}
					>
						TrustLedger
					</p>
					<h1
						style={{
							margin: "0.75rem 0 0",
							fontSize: "2.25rem",
							fontWeight: 700,
							letterSpacing: "-0.03em",
						}}
					>
						Something went wrong.
					</h1>
					<p
						style={{
							margin: "1rem 0 0",
							fontSize: "1rem",
							lineHeight: 1.7,
							color: "#9ca3af",
						}}
					>
						A critical error interrupted the application. You can retry, or head back to
						the home page to continue.
					</p>
					<div
						style={{
							marginTop: "2rem",
							display: "flex",
							gap: "0.75rem",
							justifyContent: "center",
							flexWrap: "wrap",
						}}
					>
						<button
							type="button"
							onClick={reset}
							style={{
								minHeight: "2.75rem",
								padding: "0.625rem 1.25rem",
								borderRadius: "0.75rem",
								border: "none",
								backgroundColor: "#6366f1",
								color: "#ffffff",
								fontSize: "0.875rem",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							Try Again
						</button>
						{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a plain anchor forces a full document reload, the correct way to recover from a crashed root layout; client-side next/link navigation could re-trigger the same failure. */}
						<a
							href="/"
							style={{
								minHeight: "2.75rem",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								padding: "0.625rem 1.25rem",
								borderRadius: "0.75rem",
								border: "1px solid rgba(255, 255, 255, 0.15)",
								color: "#e5e7eb",
								fontSize: "0.875rem",
								fontWeight: 600,
								textDecoration: "none",
							}}
						>
							Go Home
						</a>
					</div>
				</main>
			</body>
		</html>
	);
}
