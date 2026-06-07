import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const ReactScanMonitor =
	process.env.NODE_ENV === "development"
		? dynamic(async () => {
				const m = await import("../components/ReactScanMonitor");
				return { default: m.ReactScanMonitor };
			})
		: null;

export const metadata: Metadata = {
	title: "TrustLedger - Decentralized Freelance Escrow",
	description:
		"Create trustless freelance contracts on Ethereum Sepolia. Funds held in escrow, released on approval or arbitration.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>): React.JSX.Element {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<body
				className="min-h-full flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100"
				suppressHydrationWarning
			>
				<Providers>
					<Navbar />
					<main className="flex-1">{children}</main>
				</Providers>
				{ReactScanMonitor !== null && <ReactScanMonitor />}
			</body>
		</html>
	);
}
