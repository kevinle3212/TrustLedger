/**
 * WalletConnect Explorer wallet IDs used to feature specific wallets in the
 * Reown AppKit connect modal (consumed by `featuredWalletIds` in `lib/wagmi.ts`).
 *
 * Each value is the wallet's WalletConnect/Reown registry ID, looked up via the
 * explorer API (https://explorer-api.walletconnect.com/v3/wallets) and browsable
 * at https://walletguide.walletconnect.network. AppKit still lists every other
 * registry wallet under "All Wallets" — featuring only controls what is pinned,
 * and in what order, at the top of the modal.
 */
export const WALLET_IDS = {
	// ─── Primary wallets (surfaced first, in this order) ───────────────────────
	base: "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa",
	metaMask: "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
	phantom: "a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393",
	tangem: "21030f20fba1a77115858ee3a8bc5841c739ab4537441316e2f4b1d0a8d218af",
	// ─── Additional popular wallets ────────────────────────────────────────────
	coinbase: "d0ca99ff52b99abc48743dad0f7fc891e041be73574f7fac4afe5d4bb83845c8",
	solflare: "1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79",
	robinhood: "8837dd9413b1d9b585ee937d27a816590248386d9dbf59f5cd3422dbbb65683e",
	coldWallet: "dd15a3530dc4de4c50ebb22010824c41337403efec713f1187695c72934fb94c",
	brave: "163d2cf19babf05eb8962e9748f9ebe613ed52ebf9c8107c9a0f104bfcf161b3",
	soulSwap: "6d47c10f046c322b4882dbb6a4d8c8e5e439019402ff872412d3b79bd3a859f4",
	trust: "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0",
	okx: "971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709",
	rainbow: "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",
	zerion: "ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18",
} as const;

/**
 * Ordered list passed to AppKit's `featuredWalletIds`. The first four — Base,
 * MetaMask, Phantom, and Tangem — are the primary wallets shown to users; the
 * rest follow as additional popular options.
 */
export const FEATURED_WALLET_IDS: string[] = [
	WALLET_IDS.base,
	WALLET_IDS.metaMask,
	WALLET_IDS.phantom,
	WALLET_IDS.tangem,
	WALLET_IDS.coinbase,
	WALLET_IDS.solflare,
	WALLET_IDS.robinhood,
	WALLET_IDS.coldWallet,
	WALLET_IDS.brave,
	WALLET_IDS.soulSwap,
	WALLET_IDS.trust,
	WALLET_IDS.okx,
	WALLET_IDS.rainbow,
	WALLET_IDS.zerion,
];
