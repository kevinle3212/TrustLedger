import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { useState } from "react";

import { SecureDraftSessionPanel } from "@/app/[locale]/create/_components/SecureDraftSessionPanel";
import type { CreateState } from "@/app/[locale]/create/_lib/types";
import {
	decryptSharedDraft,
	encryptDraftForShare,
	generateDraftSaltHex,
	generateSessionKey,
	inspectAllowedWallets,
	type ShareableDraft,
	shareableDraftFromState,
} from "@/app/[locale]/create/_lib/secureDraftShare";

const CLIENT = "0x1111111111111111111111111111111111111111";
const FREELANCER = "0x2222222222222222222222222222222222222222";
let writeTextMock: jest.MockedFunction<(text: string) => Promise<void>>;
let fetchMock: jest.MockedFunction<typeof fetch>;

function decodeDraftEnvelope(encryptedDraft: string): { salt: string; iv: string } {
	const normalized = encryptedDraft.replaceAll("-", "+").replaceAll("_", "/");
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
	return JSON.parse(atob(padded)) as { salt: string; iv: string };
}

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

	it("supports stable live-room salts without reusing encryption IVs", async () => {
		const sessionKey = generateSessionKey();
		const stableSaltHex = generateDraftSaltHex();
		const draft = shareableDraftFromState(state);
		const first = await encryptDraftForShare({
			draft,
			sessionKey,
			allowedWallets: [CLIENT, FREELANCER],
			stableSaltHex,
		});
		const second = await encryptDraftForShare({
			draft,
			sessionKey,
			allowedWallets: [CLIENT, FREELANCER],
			stableSaltHex,
		});

		const firstEnvelope = decodeDraftEnvelope(first);
		const secondEnvelope = decodeDraftEnvelope(second);

		expect(first).not.toBe(second);
		expect(firstEnvelope.salt).toBe(stableSaltHex);
		expect(secondEnvelope.salt).toBe(stableSaltHex);
		expect(firstEnvelope.iv).not.toBe(secondEnvelope.iv);
		await expect(
			decryptSharedDraft({ encryptedDraft: first, sessionKey, walletAddress: FREELANCER }),
		).resolves.toEqual(draft);
		await expect(
			decryptSharedDraft({ encryptedDraft: second, sessionKey, walletAddress: FREELANCER }),
		).resolves.toEqual(draft);
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
		fetchMock = jest
			.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
			.mockResolvedValue({
				ok: true,
				json: async (): Promise<unknown> => await Promise.resolve({ snapshot: null }),
			} as Response);
		globalThis.fetch = fetchMock;
	});

	it("updates terms with format controls and formatting snippets", () => {
		const onTermsBodyChange = jest.fn();
		const onTermsFormatChange = jest.fn();

		render(
			<SecureDraftSessionPanel
				state={state}
				connectedWallet={FREELANCER}
				submissionComplete={false}
				onTermsBodyChange={onTermsBodyChange}
				onTermsFormatChange={onTermsFormatChange}
				onImportDraft={jest.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "HTML" }));
		expect(onTermsFormatChange).toHaveBeenCalledWith("html");

		fireEvent.click(screen.getByRole("button", { name: "Insert Bold terms snippet" }));
		expect(onTermsBodyChange).toHaveBeenCalledWith(`${state.termsBody}\n**Important Term**`);
		expect(screen.getByText(/Last Updated:/)).toHaveTextContent("Last Updated:");
	});

	it("wraps the selected terms text when a formatting tool is clicked", () => {
		const onTermsBodyChange = jest.fn();

		render(
			<SecureDraftSessionPanel
				state={state}
				connectedWallet={FREELANCER}
				submissionComplete={false}
				onTermsBodyChange={onTermsBodyChange}
				onTermsFormatChange={jest.fn()}
				onImportDraft={jest.fn()}
			/>,
		);

		const editor = screen.getByRole("textbox", {
			name: "Collaborative Contract Terms Editor",
		});
		if (!(editor instanceof HTMLTextAreaElement)) {
			throw new TypeError("Expected terms editor to be a textarea.");
		}
		const selectionStart = state.termsBody.indexOf("Initial draft");
		editor.focus();
		editor.setSelectionRange(selectionStart, state.termsBody.length);

		fireEvent.click(screen.getByRole("button", { name: "Insert Bold terms snippet" }));

		expect(onTermsBodyChange).toHaveBeenCalledWith("# Scope\n\n**Initial draft**");
	});

	it("inserts a local image file into markdown terms", async () => {
		const onTermsBodyChange = jest.fn();
		render(
			<SecureDraftSessionPanel
				state={state}
				connectedWallet={FREELANCER}
				submissionComplete={false}
				onTermsBodyChange={onTermsBodyChange}
				onTermsFormatChange={jest.fn()}
				onImportDraft={jest.fn()}
			/>,
		);

		const imageFile = new File(["image-bytes"], "milestone-proof.png", { type: "image/png" });
		fireEvent.click(screen.getByRole("button", { name: "Insert Image terms snippet" }));
		fireEvent.change(screen.getByLabelText("Upload Contract Terms Image"), {
			target: { files: [imageFile] },
		});

		await waitFor(() => {
			expect(onTermsBodyChange).toHaveBeenCalledWith(
				expect.stringContaining("![milestone proof](data:image/png;base64,"),
			);
		});
	});

	it("keeps controlled editor history available for undo and redo shortcuts", () => {
		function ControlledDraftPanel(): React.JSX.Element {
			const [termsBody, setTermsBody] = useState(state.termsBody);
			return (
				<SecureDraftSessionPanel
					state={{ ...state, termsBody }}
					connectedWallet={FREELANCER}
					submissionComplete={false}
					onTermsBodyChange={setTermsBody}
					onTermsFormatChange={jest.fn()}
					onImportDraft={jest.fn()}
				/>
			);
		}

		render(<ControlledDraftPanel />);

		const editor = screen.getByRole("textbox", {
			name: "Collaborative Contract Terms Editor",
		});
		if (!(editor instanceof HTMLTextAreaElement)) {
			throw new TypeError("Expected terms editor to be a textarea.");
		}

		fireEvent.change(editor, { target: { value: `${state.termsBody}\n\nSecond edit` } });
		expect(editor).toHaveValue(`${state.termsBody}\n\nSecond edit`);

		fireEvent.keyDown(editor, { key: "z", ctrlKey: true });
		expect(editor).toHaveValue(state.termsBody);

		fireEvent.keyDown(editor, { key: "y", ctrlKey: true });
		expect(editor).toHaveValue(`${state.termsBody}\n\nSecond edit`);
	});

	it("creates a share link, copies the separate key, and imports URL drafts", async () => {
		const onImportDraft = jest.fn();
		const { unmount } = render(
			<SecureDraftSessionPanel
				state={state}
				connectedWallet={FREELANCER}
				submissionComplete={false}
				onTermsBodyChange={jest.fn()}
				onTermsFormatChange={jest.fn()}
				onImportDraft={onImportDraft}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Create Encrypted Share Link" }));
		await screen.findByText("Encrypted share link created. Send the session key separately.");
		expect(screen.getByRole("button", { name: /Create Link In/u })).toBeDisabled();
		expect(screen.getByRole("button", { name: /Start Live Room In/u })).toBeDisabled();
		expect(
			screen.getByText(/Creating another link replaces the active link and key shown here/u),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Email Link And Key" })).toBeEnabled();

		fireEvent.click(screen.getByRole("button", { name: "Copy Session Key" }));
		await waitFor(() => {
			expect(writeTextMock).toHaveBeenCalledWith(expect.any(String));
		});
		expect(await screen.findByRole("button", { name: "Copied!" })).toBeEnabled();

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
				submissionComplete={false}
				onTermsBodyChange={jest.fn()}
				onTermsFormatChange={jest.fn()}
				onImportDraft={onImportDraft}
			/>,
		);

		fireEvent.change(screen.getByPlaceholderText("Paste Session Key"), {
			target: { value: sessionKey },
		});
		fireEvent.click(screen.getByRole("button", { name: "Import Draft" }));

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
				submissionComplete={false}
				onTermsBodyChange={jest.fn()}
				onTermsFormatChange={jest.fn()}
				onImportDraft={jest.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Start Live Room" }));
		await screen.findByText("Copied!");

		const encryptedUrl = screen.getByText(/tl_draft=/).textContent;
		expect(encryptedUrl).toContain("tl_room=");
		fireEvent.click(screen.getByRole("button", { name: "End Live Sync" }));
		await screen.findByText("Live sync ended. Share links and session keys were cleared.");
		expect(screen.queryByText(/tl_draft=/)).not.toBeInTheDocument();
	});
});
