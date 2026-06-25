import type { MetadataRoute } from "next";

/**
 * Web app manifest served at `/manifest.webmanifest`.
 *
 * Declares the installable PWA identity and, crucially, the PNG icon set Safari
 * and iOS read for the home-screen / add-to-dock icon. The `maskable` purpose
 * lets the platform mask the square icon to its preferred shape.
 */
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "TrustLedger",
		short_name: "TrustLedger",
		description:
			"Decentralized freelance escrow on Ethereum. Funds held in escrow, released on approval or arbitration.",
		start_url: "/",
		display: "standalone",
		background_color: "#0b0b12",
		theme_color: "#4f46e5",
		icons: [
			{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
		],
	};
}
