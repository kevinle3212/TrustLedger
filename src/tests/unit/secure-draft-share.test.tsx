import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { webcrypto } from "node:crypto";

import { SecureDraftSessionPanel } from "@/app/[locale]/create/_components/SecureDraftSessionPanel";
import type { CreateState } from "@/app/[locale]/create/_lib/types";
import {
	decryptSharedDraft,
	encryptDraftForShare,
	generateSessionKey,
	inspectAllowedWallets,
	type ShareableDraft,
	shareableDraftFromState,
} from "@/app/[locale]/create/_lib/secureDraftShare";

const CLIENT = "0x1111111111111111111111111111111111111111";
const FREELANCER = "0x2222222222222222222222222222222222222222";
let writeTextMock: jest.MockedFunction<(text: string) => Promise<void>>;

const state: CreateState = {
	proposerRole: "freelancer",
	paymentToken: "eth",
	form: {
		client: CLIENT,
		clientEmail: "client@example.com",
		amount: "1.25",
		contractURI: "ipfs://draft",
		estimatedDurationDays: "30",
		bufferFactor: "1200",
		acceptanceWindowDays: "3",
		arbitrationFeePct: "5",
		holdBack: "10",
		warrantyPeriodDays: "30",
	},
	termsBody: "# Scope\n\nInitial draft",
	termsFormat: "markdown",
	termsLastUpdatedAt: "2026-06-09T12:00:00.000Z",
	reviewOpen: false,
	magicLinkStatus: "idle",
	docMode: "manual",
	selectedFile: null,
	encryptEnabled: false,
	passphrase: "",
	pinataJwt: "",
	uploadStatus: "idle",
	uploadError: null,
	fileHash: null,
	arweaveWallet: null,
	arweaveStatus: "idle",
	arweaveUri: "",
	arweaveBalance: null,
	touched: {},
	submitAttempted: false,
};

beforeAll(() => {
	Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
});

describe("secure draft share", () => {
	it("encrypts draft snapshots and enforces the connected wallet allowlist", async () => {
		const sessionKey = generateSessionKey();
		const encryptedDraft = await encryptDraftForShare({
			draft: shareableDraftFromState(state),
			sessionKey,
			allowedWallets: [CLIENT, FREELANCER],
		});

		expect(inspectAllowedWallets(encryptedDraft)).toEqual([CLIENT, FREELANCER]);
		await expect(
			decryptSharedDraft({
				encryptedDraft,
				sessionKey,
				walletAddress: "0x3333333333333333333333333333333333333333",
			}),
		).rejects.toThrow("Connect an allowed wallet");

		const draft = await decryptSharedDraft({
			encryptedDraft,
			sessionKey,
			walletAddress: CLIENT,
		});

		expect(draft.termsBody).toBe("# Scope\n\nInitial draft");
		expect(draft.termsFormat).toBe("markdown");
	});

	it("rejects malformed encrypted draft data without leaking parser details", async () => {
		expect(inspectAllowedWallets("not-valid")).toEqual([]);
		await expect(
			decryptSharedDraft({
				encryptedDraft: "not-valid",
				sessionKey: "key",
				walletAddress: CLIENT,
			}),
		).rejects.toThrow();

		const sessionKey = generateSessionKey();
		const encryptedInvalidShape = await encryptDraftForShare({
			draft: {
				...shareableDraftFromState(state),
				termsFormat: "docx",
			} as unknown as ShareableDraft,
			sessionKey,
			allowedWallets: [CLIENT],
		});
		await expect(
			decryptSharedDraft({
				encryptedDraft: encryptedInvalidShape,
				sessionKey,
				walletAddress: CLIENT,
			}),
		).rejects.toThrow("unsupported shape");
	});
});

describe("SecureDraftSessionPanel", () => {
	beforeEach(() => {
		window.history.replaceState(null, "", "http://localhost/en/create");
		writeTextMock = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: {
				writeText: writeTextMock,
			},
		});
	});

	it("updates terms with format controls and formatting snippets", () => {
		const onTermsBodyChange = jest.fn();
		const onTermsFormatChange = jest.fn();

		render(
			<SecureDraftSessionPanel
				state={state}
				connectedWallet={FREELANCER}
				onTermsBodyChange={onTermsBodyChange}
				onTermsFormatChange={onTermsFormatChange}
				onImportDraft={jest.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "html" }));
		expect(onTermsFormatChange).toHaveBeenCalledWith("html");

		fireEvent.click(screen.getByRole("button", { name: "Insert bold terms snippet" }));
		expect(onTermsBodyChange).toHaveBeenCalledWith(`${state.termsBody}\n**important term**`);
		expect(screen.getByText(/Last updated:/)).toHaveTextContent("Last updated:");
	});

	it("creates a share link, copies the separate key, and imports URL drafts", async () => {
		const onImportDraft = jest.fn();
		const { unmount } = render(
			<SecureDraftSessionPanel
				state={state}
				connectedWallet={FREELANCER}
				onTermsBodyChange={jest.fn()}
				onTermsFormatChange={jest.fn()}
				onImportDraft={onImportDraft}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Create encrypted share link" }));
		await screen.findByText("Encrypted share link created. Send the key separately.");

		fireEvent.click(screen.getByRole("button", { name: "Copy session key" }));
		await waitFor(() => {
			expect(writeTextMock).toHaveBeenCalledWith(expect.any(String));
		});

		const lastClipboardCall = writeTextMock.mock.calls.at(-1);
		if (lastClipboardCall === undefined) throw new Error("missing session key");
		const [sessionKey] = lastClipboardCall;
		const encryptedUrl = screen.getByText(/tl_draft=/).textContent;
		expect(encryptedUrl).not.toContain(state.termsBody);
		expect(encryptedUrl).not.toContain("tl_room=");
		if (encryptedUrl === "") throw new Error("missing share data");

		unmount();
		window.history.replaceState(null, "", encryptedUrl);
		render(
			<SecureDraftSessionPanel
				state={state}
				connectedWallet={FREELANCER}
				onTermsBodyChange={jest.fn()}
				onTermsFormatChange={jest.fn()}
				onImportDraft={onImportDraft}
			/>,
		);

		fireEvent.change(screen.getByPlaceholderText("Paste session key"), {
			target: { value: sessionKey },
		});
		fireEvent.click(screen.getByRole("button", { name: "Import draft" }));

		await waitFor(() => {
			expect(onImportDraft).toHaveBeenCalledWith(
				expect.objectContaining({ form: state.form }),
			);
		});
	});

	it("starts live rooms only when the user explicitly asks for live sync", async () => {
		render(
			<SecureDraftSessionPanel
				state={state}
				connectedWallet={FREELANCER}
				onTermsBodyChange={jest.fn()}
				onTermsFormatChange={jest.fn()}
				onImportDraft={jest.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Start live room" }));
		await screen.findByText("Encrypted live room started. Send the key separately.");

		const encryptedUrl = screen.getByText(/tl_draft=/).textContent;
		expect(encryptedUrl).toContain("tl_room=");
	});
});
