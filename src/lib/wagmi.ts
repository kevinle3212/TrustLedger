import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const TRUSTLEDGER_ADDRESS: `0x${string}` =
	(process.env["NEXT_PUBLIC_TRUSTLEDGER_ADDRESS"] as `0x${string}` | undefined) ??
	"0x0000000000000000000000000000000000000000";

export const config = getDefaultConfig({
	appName: "TrustLedger",
	projectId: process.env["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"] ?? "YOUR_PROJECT_ID",
	chains: [sepolia],
	ssr: true,
});
