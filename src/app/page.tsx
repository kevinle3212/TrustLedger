import Link from "next/link";

export default function HomePage(): React.JSX.Element {
	return (
		<div className="max-w-4xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-10">
			<div className="flex flex-col items-center gap-4">
				<span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">
					Built on Ethereum Sepolia
				</span>
				<h1 className="text-5xl font-bold tracking-tight leading-tight">
					Freelance without
					<br />
					<span className="text-indigo-400">trusting anyone</span>
				</h1>
				<p className="text-lg text-gray-400 max-w-xl">
					TrustLedger holds your ETH in a smart contract escrow. Funds release on client
					approval - or via decentralized juror arbitration if there&apos;s a dispute.
				</p>
			</div>

			<div className="flex gap-4 flex-wrap justify-center">
				<Link
					href="/create"
					className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
				>
					Create a Contract
				</Link>
				<Link
					href="/dashboard"
					className="px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold transition-colors"
				>
					View My Contracts
				</Link>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mt-8">
				{[
					{
						title: "Escrow Protection",
						desc: "ETH is locked in the contract. Neither party can move it unilaterally.",
					},
					{
						title: "Dispute Arbitration",
						desc: "Staked jurors vote on outcomes via a commit-reveal system. Minority voters are slashed.",
					},
					{
						title: "Warranty Hold-back",
						desc: "Optionally retain 5-15% of payment until a warranty period elapses.",
					},
				].map((f) => (
					<div
						key={f.title}
						className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left flex flex-col gap-2"
					>
						<h3 className="font-semibold text-white">{f.title}</h3>
						<p className="text-sm text-gray-400">{f.desc}</p>
					</div>
				))}
			</div>
		</div>
	);
}
