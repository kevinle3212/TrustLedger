declare namespace NodeJS {
	interface ProcessEnv {
		// ─── Deployed contract addresses (default network) ────────────────────────
		// Deploy scripts and `npm run sync-env` populate these from
		// artifacts/deployed-addresses.json. Source of truth: src/lib/wagmi.ts.
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS?: string;
		NEXT_PUBLIC_ARBITRATION_ADDRESS?: string;
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS?: string;
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS?: string;
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK?: string;
		// Sepolia — auto-updated by .github/workflows/deploy.yml after contract deploys.
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_SEPOLIA?: string;
		NEXT_PUBLIC_ARBITRATION_ADDRESS_SEPOLIA?: string;
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_SEPOLIA?: string;
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_SEPOLIA?: string;
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_SEPOLIA?: string;
		// Arbitrum — only set after deploying to Arbitrum mainnet.
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_ARBITRUM?: string;
		NEXT_PUBLIC_ARBITRATION_ADDRESS_ARBITRUM?: string;
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_ARBITRUM?: string;
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_ARBITRUM?: string;
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_ARBITRUM?: string;
		// Base — only set after deploying to Base mainnet.
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_BASE?: string;
		NEXT_PUBLIC_ARBITRATION_ADDRESS_BASE?: string;
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_BASE?: string;
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_BASE?: string;
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_BASE?: string;
		// Optimism — only set after deploying to Optimism mainnet.
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_OPTIMISM?: string;
		NEXT_PUBLIC_ARBITRATION_ADDRESS_OPTIMISM?: string;
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_OPTIMISM?: string;
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_OPTIMISM?: string;
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_OPTIMISM?: string;
		// Public token-address overrides. Leave blank to use chain defaults in src/lib/wagmi.ts.
		NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA?: string;
		NEXT_PUBLIC_USDC_ADDRESS_ARBITRUM?: string;
		NEXT_PUBLIC_USDC_ADDRESS_BASE?: string;
		NEXT_PUBLIC_USDC_ADDRESS_OPTIMISM?: string;
		// Solana escrow (programs/solana-escrow). Public address of the deployed escrow
		// program; unset/invalid disables SOL escrow submission (src/lib/solanaEscrow.ts).
		NEXT_PUBLIC_SOLANA_PROGRAM_ID?: string;
		// Solana cluster label (mainnet-beta | devnet | localnet). Defaults to devnet.
		NEXT_PUBLIC_SOLANA_CLUSTER?: string;
		// Optional Solana RPC override; falls back to the cluster's default endpoint.
		NEXT_PUBLIC_SOLANA_RPC_URL?: string;
		// ─── Dual-asset staking ────────────────────────────────────────────────────
		// Deployed StakingVault (USDC staking) addresses. Published by the staking deploy
		// (npm run foundry:deploy:staking:sepolia). No hardcoded default: an unset/zero value
		// means USDC staking is not yet configured on that network. Source: src/lib/wagmi.ts.
		NEXT_PUBLIC_STAKING_VAULT_ADDRESS?: string;
		NEXT_PUBLIC_STAKING_VAULT_ADDRESS_SEPOLIA?: string;
		NEXT_PUBLIC_STAKING_VAULT_ADDRESS_ARBITRUM?: string;
		NEXT_PUBLIC_STAKING_VAULT_ADDRESS_BASE?: string;
		NEXT_PUBLIC_STAKING_VAULT_ADDRESS_OPTIMISM?: string;
		// Public Solana program ID of the deployed native SOL staking program
		// (programs/solana-staking). Required before SOL staking is enabled; safe to expose
		// (program IDs are public addresses).
		NEXT_PUBLIC_SOLANA_STAKING_PROGRAM_ID?: string;
		// ─── Wallet connection ─────────────────────────────────────────────────────
		// Powers the Reown AppKit connect modal (src/lib/wagmi.ts). Without it
		// QR/mobile flows (MetaMask, Tangem, WalletConnect) fail. Not a secret —
		// ends up in the browser bundle. Get a free ID at dashboard.reown.com.
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string;
		// ─── E2E / Playwright ─────────────────────────────────────────────────────
		// NEXT_PUBLIC_E2E_MOCK_WALLET="1" is inlined at build time to swap in the
		// deterministic mock wagmi connector (see src/lib/wagmi.ts and
		// .github/workflows/ci.yml e2e-wallet job). The remaining vars configure
		// the Playwright runner (src/playwright.config.ts).
		NEXT_PUBLIC_E2E_MOCK_WALLET?: string;
		PORT?: string;
		PLAYWRIGHT_WEB_SERVER_HOST?: string;
		PLAYWRIGHT_BASE_URL?: string;
		PLAYWRIGHT_USE_DEV_SERVER?: string;
		CI?: string;
		// ─── App URLs ─────────────────────────────────────────────────────────────
		// On Vercel these are derived from system env vars; set them only for local
		// dev or non-Vercel deployments.
		// Origin advertised to wallets during WalletConnect/AppKit pairing (SSR/build
		// fallback only — the live origin is always used on the client).
		NEXT_PUBLIC_SITE_URL?: string;
		// Base URL for building magic-link URLs in onboarding emails and wallet metadata.
		NEXT_PUBLIC_APP_URL?: string;
		// ─── GitHub ───────────────────────────────────────────────────────────────
		// Source repo link shown in the navbar; also powers /status GitHub stats when
		// the repository is public. On Vercel, built automatically from
		// VERCEL_GIT_REPO_OWNER / VERCEL_GIT_REPO_SLUG — no manual config needed.
		NEXT_PUBLIC_GITHUB_URL?: string;
		// Server-only token for higher GitHub API rate limits. Private repos remain
		// hidden from public analytics even when this token can access them.
		GITHUB_TOKEN?: string;
		// ─── IPFS / Pinata ────────────────────────────────────────────────────────
		// JWT scoped to Files pinning (pinata.cloud → API Keys → + New Key → Files).
		// Powers the "Upload File" tab on the contract creation page. Safe to expose
		// when scoped to pinning only — not a secret.
		NEXT_PUBLIC_PINATA_JWT?: string;
		// ─── Development tools ────────────────────────────────────────────────────
		// Enables the React Scan render-diagnostic overlay in development.
		// Keep false for accessibility testing — the overlay is not part of the TrustLedger UI.
		NEXT_PUBLIC_ENABLE_REACT_SCAN?: string;
		// ─── Oracle price feed ────────────────────────────────────────────────────
		// Server-side price source compatible with the CoinGecko simple price
		// response shape. Defaults to https://api.coingecko.com/api/v3/simple/price.
		ORACLE_PRICE_SOURCE_URL?: string;
		// Server-side cache TTL in ms for GET /api/oracle/rates.
		// Defaults to 60000 (1 min); capped at 3600000 (1 hr).
		ORACLE_RATE_TTL_MS?: string;
	}
}
