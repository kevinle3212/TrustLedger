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
		// ─── Docs ───────────────────────────────────────────────────────────────
		// Documentation site link shown in the navbar beside the GitHub icon.
		// Optional: when unset or empty, the Docs link is hidden.
		NEXT_PUBLIC_DOCS_URL?: string;
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
		// ─── AI providers ──────────────────────────────────────────────────────────
		// Master switch for the AI infrastructure (src/core/ai). Unset/false disables
		// AI-backed features.
		AI_ENABLED?: string;
		// Primary provider adapter kind (e.g. "gemini"). See src/core/ai/registry.ts.
		AI_PROVIDER_KIND?: string;
		// Primary provider API base URL override.
		AI_BASE_URL?: string;
		// Primary provider API key. Server-only secret.
		AI_API_KEY?: string;
		// Primary provider default model id.
		AI_DEFAULT_MODEL?: string;
		// Default provider name used when routing is unconfigured.
		AI_DEFAULT_PROVIDER?: string;
		// JSON-encoded multi-provider configuration (src/core/ai/config.ts).
		AI_PROVIDERS_JSON?: string;
		// JSON-encoded route configuration mapping request types to providers.
		AI_ROUTES_JSON?: string;
		// Server-only secret. When set, registers an OpenRouter fallback provider
		// (OpenAI-compatible) that the AI router uses if the primary provider errors
		// or is unconfigured. Get a key at https://openrouter.ai/keys. Never
		// NEXT_PUBLIC.
		OPENROUTER_API_KEY?: string;
		// Optional override of the OpenRouter API base. Defaults to
		// https://openrouter.ai/api/v1.
		OPENROUTER_BASE_URL?: string;
		// Optional model id used by the OpenRouter fallback provider. Defaults to
		// deepseek/deepseek-chat-v3-0324:free (a free OpenRouter model).
		AI_FALLBACK_MODEL?: string;
		// ─── Legacy AI vars (deprecated) ───────────────────────────────────────────
		// Pre-unification provider-specific vars. Read only as backward-compat when
		// AI_PROVIDER_KIND is unset (src/core/ai/config.ts legacyProvider). Migrate
		// to the unified AI_* set above; gemini wins when both legacy keys are set.
		/** @deprecated Set AI_PROVIDER_KIND=gemini + AI_API_KEY instead. */
		GEMINI_API_KEY?: string;
		/** @deprecated Set AI_DEFAULT_MODEL instead. */
		GEMINI_MODEL?: string;
		/** @deprecated Set AI_PROVIDER_KIND=openai-compatible + AI_API_KEY instead. */
		OPENAI_API_KEY?: string;
		/** @deprecated Set AI_BASE_URL instead. */
		OPENAI_BASE_URL?: string;
		/** @deprecated Set AI_DEFAULT_MODEL instead. */
		OPENAI_MODEL?: string;
		/** @deprecated Superseded by AI_DEFAULT_PROVIDER / AI_PROVIDER_KIND. */
		AI_SUMMARY_PROVIDER?: string;
		// ─── Database (Prisma / Neon) ──────────────────────────────────────────────
		// Pooled Postgres connection string used by the Prisma client (src/lib/db).
		DATABASE_URL?: string;
		// Direct (non-pooled) Postgres connection string, used for migrations.
		DIRECT_URL?: string;
		// ─── Admin & sensitive-route access ────────────────────────────────────────
		// Comma-separated IP allowlist gating /admin and /api/admin/* in src/proxy.ts.
		SENSITIVE_ALLOWED_IPS?: string;
		// Legacy/fallback IP allowlist for admin routes; used when
		// SENSITIVE_ALLOWED_IPS is unset (src/proxy.ts, src/services/adminAuth.ts).
		ADMIN_ALLOWED_IPS?: string;
		// Bootstrap admin account password hash, used to seed the first admin.
		ADMIN_BOOTSTRAP_PASSWORD_HASH?: string;
		// Bootstrap admin account email.
		ADMIN_BOOTSTRAP_EMAIL?: string;
		// Bootstrap admin account username.
		ADMIN_BOOTSTRAP_USERNAME?: string;
		// Bootstrap admin account wallet address.
		ADMIN_BOOTSTRAP_WALLET_ADDRESS?: string;
		// Comma-separated wallet addresses granted admin access.
		ADMIN_WALLET_ADDRESSES?: string;
		// JSON-encoded list of admin accounts (src/services/adminAuth.ts).
		ADMIN_ACCOUNTS_JSON?: string;
		// Bearer token accepted for admin API authentication.
		ADMIN_API_TOKEN?: string;
		// Secret used to sign/verify admin session cookies.
		ADMIN_SESSION_SECRET?: string;
		// Bearer token accepted for the health-check endpoint.
		HEALTH_CHECK_TOKEN?: string;
		// Comma-separated IP allowlist for the health-check endpoint.
		HEALTH_CHECK_ALLOWED_IPS?: string;
		// Bearer token accepted for internal/service-to-service API calls.
		INTERNAL_API_TOKEN?: string;
		// Secret required by scheduled cron routes (e.g. deadline reminders).
		CRON_SECRET?: string;
		// ─── Auth & session secrets ────────────────────────────────────────────────
		// Signing secret for offchain-account auth JWTs.
		AUTH_JWT_SECRET?: string;
		// Signing secret for offchain-account sessions.
		ACCOUNT_SESSION_SECRET?: string;
		// Signing secret for magic-link tokens (send/verify routes).
		MAGIC_LINK_SECRET?: string;
		// 32-byte base64 key encrypting stored TOTP 2FA secrets (AES-256-GCM,
		// src/services/totp.ts). Unset falls back to a random per-process key
		// (dev only); production must set it so secrets survive restarts.
		TOTP_ENCRYPTION_KEY?: string;
		// ─── Email ──────────────────────────────────────────────────────────────────
		// Selects the active email provider (e.g. "resend" | "postmark" | "brevo").
		EMAIL_PROVIDER?: string;
		// Default "from" address used across email providers.
		EMAIL_FROM?: string;
		// Resend API key. Server-only secret.
		RESEND_API_KEY?: string;
		// Resend "from" address override.
		RESEND_FROM?: string;
		// Postmark server token. Server-only secret.
		POSTMARK_SERVER_TOKEN?: string;
		// Postmark message stream id.
		POSTMARK_MESSAGE_STREAM?: string;
		// Postmark "from" address override.
		POSTMARK_FROM?: string;
		// Brevo API key. Server-only secret.
		BREVO_API_KEY?: string;
		// Brevo "from" address override.
		BREVO_FROM?: string;
		// ─── Notifications ──────────────────────────────────────────────────────────
		// Comma-separated notification recipient list for cron/deadline reminders.
		NOTIFICATION_EMAILS?: string;
		// Shared secret required to call the notifications API route.
		NOTIFICATIONS_SECRET?: string;
		// ─── Analytics ──────────────────────────────────────────────────────────────
		// Server-side switch enabling privacy-respecting traffic analytics.
		TRUSTLEDGER_ANALYTICS_ENABLED?: string;
		// Retention window in days for stored traffic analytics events.
		TRUSTLEDGER_ANALYTICS_RETENTION_DAYS?: string;
		// Client-visible switch surfaced by /status for the privacy analytics badge.
		NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED?: string;
		// ─── RPC ────────────────────────────────────────────────────────────────────
		// Server-side Sepolia RPC endpoint used by contract read routes.
		SEPOLIA_RPC_URL?: string;
		// ─── Vercel system env (auto-populated on Vercel deployments) ──────────────
		VERCEL?: string;
		VERCEL_ENV?: string;
		VERCEL_GIT_REPO_OWNER?: string;
		VERCEL_GIT_REPO_SLUG?: string;
		VERCEL_GIT_COMMIT_SHA?: string;
		// Optional base path override for next.config.ts.
		NEXT_BASE_PATH?: string;
	}
}
