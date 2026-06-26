/**
 * Staking adapter factory.
 *
 * Resolves the concrete {@link StakeAdapter} for a given asset under a runtime availability
 * context. Every adapter shares one contract: gate on configuration, plan real action sequences,
 * and read via an injected {@link StakeReader}. Selecting an unconfigured asset yields a disabled
 * adapter (no reads, no actions) rather than a mocked path — see each adapter for specifics.
 */
import type { StakeAdapter } from "../abstractions";
import type { StakeAssetId } from "../assets";
import type { StakeAvailabilityContext } from "../config";
import { createEthAdapter } from "./eth";
import { createSolAdapter } from "./sol";
import { createUsdcAdapter } from "./usdc";
import type { StakeReader } from "./shared";

export type { StakeReader } from "./shared";

/** Returns the adapter for `assetId`, wired to the given context and optional on-chain reader. */
export function getStakeAdapter(
	assetId: StakeAssetId,
	context: StakeAvailabilityContext,
	reader?: StakeReader,
): StakeAdapter {
	switch (assetId) {
		case "ETH":
			return createEthAdapter(context, reader);
		case "USDC":
			return createUsdcAdapter(context, reader);
		case "SOL":
			return createSolAdapter(context, reader);
	}
}
