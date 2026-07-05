import {
	base64ToBytes,
	bytesToBase64,
	decryptMessage,
	deriveKek,
	deriveMessageKey,
	encryptMessage,
	generateIdentity,
	unwrapPrivateKey,
	wrapPrivateKey,
} from "@/lib/crypto/e2e";

const addrA = "0x1111111111111111111111111111111111111111";
const addrB = "0x2222222222222222222222222222222222222222";
// Any 65-byte-ish hex works as fake signature material for KEK derivation.
const signatureHex = `0x${"ab".repeat(65)}`;

describe("e2e crypto envelope", () => {
	it("wraps and unwraps a private key round-trip via the derived KEK", () => {
		const identity = generateIdentity();
		const kek = deriveKek(signatureHex);
		const { wrappedPrivateKey, wrapNonce } = wrapPrivateKey(identity.privateKey, kek);
		const unwrapped = unwrapPrivateKey(wrappedPrivateKey, wrapNonce, kek);

		expect(bytesToBase64(unwrapped)).toBe(bytesToBase64(identity.privateKey));
	});

	it("derives the KEK deterministically from the same signature", () => {
		expect(bytesToBase64(deriveKek(signatureHex))).toBe(bytesToBase64(deriveKek(signatureHex)));
	});

	it("both parties derive the same per-conversation message key", () => {
		const alice = generateIdentity();
		const bob = generateIdentity();

		const aliceKey = deriveMessageKey(alice.privateKey, bob.publicKey, addrA, addrB);
		// Bob passes the addresses in the opposite order; the salt is order-independent.
		const bobKey = deriveMessageKey(bob.privateKey, alice.publicKey, addrB, addrA);

		expect(bytesToBase64(aliceKey)).toBe(bytesToBase64(bobKey));
	});

	it("encrypts and decrypts a message round-trip", () => {
		const alice = generateIdentity();
		const bob = generateIdentity();
		const key = deriveMessageKey(alice.privateKey, bob.publicKey, addrA, addrB);
		const plaintext = "Ship the milestone by Friday — no off-platform payments.";

		const { ciphertext, nonce } = encryptMessage(plaintext, key);
		expect(decryptMessage(ciphertext, nonce, key)).toBe(plaintext);
	});

	it("rejects tampered ciphertext", () => {
		const alice = generateIdentity();
		const bob = generateIdentity();
		const key = deriveMessageKey(alice.privateKey, bob.publicKey, addrA, addrB);
		const { ciphertext, nonce } = encryptMessage("secret", key);

		const bytes = base64ToBytes(ciphertext);
		bytes[0] = (bytes[0] ?? 0) ^ 0xff;
		expect(() => decryptMessage(bytesToBase64(bytes), nonce, key)).toThrow();
	});

	it("rejects unwrapping with the wrong KEK", () => {
		const identity = generateIdentity();
		const { wrappedPrivateKey, wrapNonce } = wrapPrivateKey(
			identity.privateKey,
			deriveKek(signatureHex),
		);
		const wrongKek = deriveKek(`0x${"cd".repeat(65)}`);
		expect(() => unwrapPrivateKey(wrappedPrivateKey, wrapNonce, wrongKek)).toThrow();
	});
});
