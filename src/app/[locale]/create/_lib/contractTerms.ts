import type { ContractTermsFormat } from "./types";

export const DEFAULT_CONTRACT_TERMS: Record<ContractTermsFormat, string> = {
	markdown: `# Independent Contractor Services Agreement

## 1. Parties
- Client: [Client wallet or legal name]
- Freelancer: [Freelancer wallet or legal name]

## 2. Scope of Work
The freelancer will provide the services, milestones, and deliverables described in this agreement and any attached contract document.

## 3. Payment and Escrow
The client will fund the agreed amount into TrustLedger escrow. Funds release only after approval, deadline rules, or dispute resolution.

## 4. Delivery and Acceptance
The freelancer will submit deliverables before the deadline. The client will review in good faith during the acceptance window.

## 5. Changes
Material scope, timeline, or payment changes must be confirmed by both parties in writing before they are relied on.

## 6. Disputes
If a dispute opens, each party may submit evidence. Juror arbitration determines the final payout according to the on-chain rules.

## 7. Confidentiality and Rights
Each party will protect confidential information and respect intellectual property rights stated in the attached document.

## 8. Signatures
By submitting or accepting this escrow contract, the connected wallet confirms agreement to these terms.`,
	html: `<h1>Independent Contractor Services Agreement</h1>

<h2>1. Parties</h2>
<ul>
	<li>Client: [Client wallet or legal name]</li>
	<li>Freelancer: [Freelancer wallet or legal name]</li>
</ul>

<h2>2. Scope of Work</h2>
<p>The freelancer will provide the services, milestones, and deliverables described in this agreement and any attached contract document.</p>

<h2>3. Payment and Escrow</h2>
<p>The client will fund the agreed amount into TrustLedger escrow. Funds release only after approval, deadline rules, or dispute resolution.</p>

<h2>4. Delivery and Acceptance</h2>
<p>The freelancer will submit deliverables before the deadline. The client will review in good faith during the acceptance window.</p>

<h2>5. Changes</h2>
<p>Material scope, timeline, or payment changes must be confirmed by both parties in writing before they are relied on.</p>

<h2>6. Disputes</h2>
<p>If a dispute opens, each party may submit evidence. Juror arbitration determines the final payout according to the on-chain rules.</p>

<h2>7. Confidentiality and Rights</h2>
<p>Each party will protect confidential information and respect intellectual property rights stated in the attached document.</p>

<h2>8. Signatures</h2>
<p>By submitting or accepting this escrow contract, the connected wallet confirms agreement to these terms.</p>`,
	plain: `Independent Contractor Services Agreement

1. Parties
Client: [Client wallet or legal name]
Freelancer: [Freelancer wallet or legal name]

2. Scope of Work
The freelancer will provide the services, milestones, and deliverables described in this agreement and any attached contract document.

3. Payment and Escrow
The client will fund the agreed amount into TrustLedger escrow. Funds release only after approval, deadline rules, or dispute resolution.

4. Delivery and Acceptance
The freelancer will submit deliverables before the deadline. The client will review in good faith during the acceptance window.

5. Changes
Material scope, timeline, or payment changes must be confirmed by both parties in writing before they are relied on.

6. Disputes
If a dispute opens, each party may submit evidence. Juror arbitration determines the final payout according to the on-chain rules.

7. Confidentiality and Rights
Each party will protect confidential information and respect intellectual property rights stated in the attached document.

8. Signatures
By submitting or accepting this escrow contract, the connected wallet confirms agreement to these terms.`,
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function markdownToHtml(value: string): string {
	const lines = value.split("\n");
	const html: string[] = [];
	let inList = false;

	for (const line of lines) {
		if (line.startsWith("# ")) {
			if (inList) {
				html.push("</ul>");
				inList = false;
			}
			html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
		} else if (line.startsWith("## ")) {
			if (inList) {
				html.push("</ul>");
				inList = false;
			}
			html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
		} else if (line.startsWith("- ")) {
			if (!inList) {
				html.push("<ul>");
				inList = true;
			}
			html.push(`\t<li>${escapeHtml(line.slice(2))}</li>`);
		} else if (line.trim() === "") {
			if (inList) {
				html.push("</ul>");
				inList = false;
			}
			html.push("");
		} else {
			if (inList) {
				html.push("</ul>");
				inList = false;
			}
			html.push(`<p>${escapeHtml(line)}</p>`);
		}
	}

	if (inList) html.push("</ul>");
	return html.join("\n");
}

function markdownToPlain(value: string): string {
	return value
		.replace(/^##?\s+/gm, "")
		.replace(/^- /gm, "")
		.replace(/\*\*(.*?)\*\*/g, "$1")
		.replace(/_(.*?)_/g, "$1");
}

function htmlToPlain(value: string): string {
	return value
		.replace(/<\/(h1|h2|p|li)>/gi, "\n")
		.replace(/<li>/gi, "- ")
		.replace(/<[^>]+>/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function htmlToMarkdown(value: string): string {
	return value
		.replace(/<h1>(.*?)<\/h1>/gis, "# $1\n")
		.replace(/<h2>(.*?)<\/h2>/gis, "## $1\n")
		.replace(/<li>(.*?)<\/li>/gis, "- $1\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<p>/gi, "")
		.replace(/<\/?ul>/gi, "")
		.replace(/<[^>]+>/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function convertContractTerms(
	value: string,
	from: ContractTermsFormat,
	to: ContractTermsFormat,
): string {
	if (from === to) return value;
	const trimmed = value.trim();
	if (trimmed === "") return DEFAULT_CONTRACT_TERMS[to];

	if (from === "markdown" && to === "html") return markdownToHtml(value);
	if (from === "markdown" && to === "plain") return markdownToPlain(value);
	if (from === "html" && to === "markdown") return htmlToMarkdown(value);
	if (from === "html" && to === "plain") return htmlToPlain(value);
	if (from === "plain" && to === "markdown") {
		return `# Independent Contractor Services Agreement\n\n${value}`;
	}
	if (from === "plain" && to === "html") {
		return value
			.split(/\n{2,}/)
			.map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`)
			.join("\n\n");
	}

	return value;
}
