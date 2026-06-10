/**
 * @jest-environment node
 */
import { Keypair, PublicKey } from "@solana/web3.js";
import {
	buildCreateSolanaEscrowTransaction,
	encodeCreateSolanaEscrowInstruction,
	getTrustLedgerSolanaProgramId,
	parseSolToLamports,
} from "@/lib/solanaEscrow";
import type { FormFields } from "@/app/[locale]/create/_lib/types";

const previousProgramId = process.env["NEXT_PUBLIC_SOLANA_PROGRAM_ID"];
const payerAddress = "9xQeWvG816bUx9EPfVb6i4VzvABAGG6x9G3Y9ncUUXjP";
const counterpartyAddress = "7oS8AQkXghx1JYDwQ4TDDN5J9LNf9jXTG8DcZxK5fJLy";
const testHash = "0x1111111111111111111111111111111111111111111111111111111111111111";
const escrowSeed = "trustledger_escrow";

const baseForm: FormFields = {
	client: counterpartyAddress,
	clientEmail: "",
	amount: "1.25",
	contractURI: "ipfs://bafybeigdyrzt5sfp7udm7hu76on5rj4cf4j2m2nqqsv5uchve4vfz5rt3a",
	estimatedDurationDays: "30",
	bufferFactor: "1200",
	acceptanceWindowDays: "3",
	arbitrationFeePct: "5",
	holdBack: "10",
	warrantyPeriodDays: "30",
};

function findViableProgramId(): PublicKey {
	const payer = new PublicKey(payerAddress);
	const counterparty = new PublicKey(counterpartyAddress);
	const hash = new Uint8Array(32).fill(0x11);
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const programId = Keypair.generate().publicKey;
		try {
			PublicKey.findProgramAddressSync(
				[
					new TextEncoder().encode(escrowSeed),
					payer.toBuffer(),
					counterparty.toBuffer(),
					hash,
				],
				programId,
			);
			return programId;
		} catch {
			// Keep searching for a fixture that is viable in the active Solana SDK build.
		}
	}
	throw new Error("Unable to find a viable Solana program ID test fixture.");
}

describe("solana escrow client", () => {
	afterEach(() => {
		process.env["NEXT_PUBLIC_SOLANA_PROGRAM_ID"] = previousProgramId;
	});

	it("parses SOL to lamports without floating point rounding", () => {
		expect(parseSolToLamports("1")).toBe(1_000_000_000n);
		expect(parseSolToLamports("0.000000001")).toBe(1n);
		expect(parseSolToLamports("12.345678901")).toBe(12_345_678_901n);
		expect(() => parseSolToLamports("0.0000000001")).toThrow(
			"SOL supports up to 9 decimal places.",
		);
	});

	it("returns null when the program ID is not configured", () => {
		process.env["NEXT_PUBLIC_SOLANA_PROGRAM_ID"] = "";

		expect(getTrustLedgerSolanaProgramId()).toBeNull();
	});

	it("encodes create escrow instruction bytes deterministically", () => {
		const encoded = encodeCreateSolanaEscrowInstruction({
			amountLamports: 1_250_000_000n,
			durationSeconds: 2_592_000n,
			acceptanceWindowSeconds: 259_200n,
			arbitrationFeeBps: 500,
			holdBackBps: 1_000,
			warrantySeconds: 2_592_000n,
			contractHash: new Uint8Array(32).fill(7),
			proposerRole: "client",
			contractUri: "ipfs://contract",
		});

		expect(encoded[0]).toBe(0);
		expect(Buffer.from(encoded.slice(1, 9)).readBigUInt64LE()).toBe(1_250_000_000n);
		expect(encoded[69]).toBe(1);
		expect(Buffer.from(encoded.slice(70, 72)).readUInt16LE()).toBe("ipfs://contract".length);
	});

	it("builds a configured Solana escrow transaction with the expected accounts", () => {
		const testProgramId = findViableProgramId();
		process.env["NEXT_PUBLIC_SOLANA_PROGRAM_ID"] = testProgramId.toBase58();

		const draft = buildCreateSolanaEscrowTransaction({
			form: baseForm,
			proposerRole: "client",
			payerAddress,
			fileHash: testHash,
			programId: testProgramId,
		});
		const instruction = draft.transaction.instructions[0];
		if (instruction === undefined) {
			throw new Error("Expected the Solana escrow transaction to contain an instruction.");
		}

		expect(draft.amountLamports).toBe(1_250_000_000n);
		expect(draft.programId).toBe(testProgramId.toBase58());
		expect(PublicKey.isOnCurve(draft.escrowAddress)).toBe(false);
		expect(instruction.keys).toHaveLength(5);
		expect(instruction.keys[0]?.pubkey.toBase58()).toBe(payerAddress);
		expect(instruction.keys[1]?.pubkey.toBase58()).toBe(counterpartyAddress);
	});
});
