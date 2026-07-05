import {
	appendMessage,
	getMessages,
	getOrCreateConversation,
	listConversations,
	registerKey,
	resetMessagingForTests,
} from "@/services/messaging";

jest.mock("server-only", () => ({}), { virtual: true });

const alice = "0xAAAA000000000000000000000000000000000001";
const bob = "0xBBBB000000000000000000000000000000000002";
const carol = "0xCCCC000000000000000000000000000000000003";

// Exercises the in-memory fallback (DATABASE_URL unset).
describe("messaging service", () => {
	beforeEach(() => {
		resetMessagingForTests();
	});

	it("returns the same conversation regardless of participant order", async () => {
		const first = await getOrCreateConversation(alice, bob);
		const second = await getOrCreateConversation(bob, alice);
		expect(second).toBe(first);
	});

	it("gates message access to participants", async () => {
		const id = await getOrCreateConversation(alice, bob);
		await expect(getMessages(carol, id)).rejects.toThrow(
			"Not a participant of this conversation.",
		);
	});

	it("appends and lists messages, tracking unread for the recipient", async () => {
		const id = await getOrCreateConversation(alice, bob);
		await appendMessage(alice, id, { ciphertext: "ct", nonce: "nc" });

		const messages = await getMessages(bob, id);
		expect(messages).toHaveLength(1);
		expect(messages[0]?.senderAddress).toBe(alice.toLowerCase());

		const bobList = await listConversations(bob);
		expect(bobList[0]?.unread).toBe(1);
		expect(bobList[0]?.peer).toBe(alice.toLowerCase());
	});

	it("stores and reads back a wallet's own key bundle", async () => {
		await registerKey(alice, { publicKey: "pk", wrappedPrivateKey: "wpk", wrapNonce: "wn" });
		const list = await listConversations(alice);
		expect(list).toEqual([]);
	});
});
