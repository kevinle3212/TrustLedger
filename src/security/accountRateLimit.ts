import { createRateLimiter } from "@/security/rateLimit";

export const ACCOUNT_SECURITY_RETRY_AFTER_SECONDS = 5 * 60;

const accountSecurityLimiter = createRateLimiter(5, ACCOUNT_SECURITY_RETRY_AFTER_SECONDS * 1000);

/**
 * Applies a per-wallet throttle to sensitive account verification attempts.
 *
 * @param walletAddress - Wallet address associated with the attempted verification.
 * @returns `true` when the caller should receive a 429 response.
 */
export function isAccountSecurityRateLimited(walletAddress: string): boolean {
	return accountSecurityLimiter.check(walletAddress.trim().toLowerCase());
}
