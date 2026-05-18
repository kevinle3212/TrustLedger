"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar(): React.JSX.Element {
	const path = usePathname();
	const linkClass = (href: string): string =>
		`text-sm font-medium transition-colors ${
			path === href ? "text-white" : "text-gray-400 hover:text-white"
		}`;

	return (
		<header className="border-b border-white/10 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
			<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
				<div className="flex items-center gap-8">
					<Link
						href="/"
						className="flex items-center gap-2 text-indigo-400 font-bold text-lg tracking-tight"
					>
						<Image
							src="/logo.png"
							alt="TrustLedger logo"
							width={28}
							height={28}
							className="rounded-sm"
						/>
						TrustLedger
					</Link>
					<nav className="flex items-center gap-6">
						<Link href="/create" className={linkClass("/create")}>
							New Contract
						</Link>
						<Link href="/dashboard" className={linkClass("/dashboard")}>
							Dashboard
						</Link>
					</nav>
				</div>
				<ConnectButton chainStatus="icon" showBalance={false} />
			</div>
		</header>
	);
}
