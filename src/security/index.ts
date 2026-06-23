/**
 * TrustLedger frontend security toolkit.
 *
 * A single import surface for the app's client- and server-side security
 * helpers. New helpers live here; pre-existing validators and crypto stay in
 * `@/lib/validation` and `@/lib/encryption` and are re-exported below so callers
 * have one place to reach for security primitives.
 *
 *   import { copyToClipboard, sanitizeUrl, validateEthAddress } from "@/security";
 *
 * See `src/security/README.md` for the full map and the contract-side tooling
 * under the repo-root `security/` directory.
 */

// Clipboard (safe, never-throwing copy)
export { copyToClipboard, isClipboardAvailable } from "./clipboard";

// HTTP security headers + Content-Security-Policy
export { SECURITY_HEADERS, applySecurityHeaders, buildContentSecurityPolicy } from "./headers";

// Reusable rate limiting
export { createRateLimiter, type RateLimiter } from "./rateLimit";

// Origin/CSRF protection for API routes
export { isSameOriginRequest } from "./csrf";

// Trusted server-to-server (bearer service token) request recognition
export { isTrustedServiceRequest } from "./serviceAuth";

// Input/output sanitization
export {
	escapeHtml,
	sanitizeFileName,
	sanitizeText,
	sanitizeUrl,
	stripControlChars,
} from "./sanitize";

// EVM address safety
export {
	ZERO_ADDRESS,
	addressesEqual,
	isEvmAddress,
	isZeroAddress,
	toChecksumAddress,
} from "./address";

// Pre-existing field validators (user-facing messages)
export {
	validateContractUri,
	validateDeliverableUri,
	validateEmail,
	validateEthAddress,
	validateEthAmount,
	validateNumberInRange,
	validateRequired,
	validateScore,
	validateSolAmount,
	validateSolanaAddress,
	validateUsdcAmount,
	type ValidationResult,
} from "@/lib/validation";

// Pre-existing client-side file encryption (AES-GCM via Web Crypto)
export { decryptFile, encryptFile } from "@/lib/encryption";
