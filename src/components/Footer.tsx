import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function Footer(): React.JSX.Element {
	return (
		<footer className="border-t border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
			<div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-gray-400">
				<p>&copy; 2026 TrustLedger</p>
				<div className="w-full sm:ms-auto sm:w-auto">
					<LocaleSwitcher />
				</div>
			</div>
		</footer>
	);
}
