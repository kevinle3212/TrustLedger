"""Generate a dummy freelance service agreement PDF for TrustLedger demos.

The output PDF is meant to be uploaded as the "Contract Document" when creating
an escrow on TrustLedger. Its keccak256 hash is stored on-chain (contractHash)
and the file itself is pinned to IPFS (contractURI). Any later edit to the file
changes the hash and fails the on-chain match.

Functions:
    build_styles(): Define and return the custom paragraph styles for the PDF.
    main(): Build the sample agreement PDF and write it to disk.

Libraries/Packages:
    reportlab: PDF generation library; used here to lay out the contract document
        with custom paragraph styles, tables, and spacing.
    os: Standard library module; used to build the output path in an
        operating-system-independent way.

Usage:
    python3 utils/generate_contract.py

Output:
    utils/sample-contract.pdf
"""

# Type stubs for reportlab are provided by the "types-reportlab" package
# (install with `mypy --install-types`, or `pip install -r utils/requirements.txt`),
# so static type checkers can resolve these imports without suppression.
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.styles import (
    StyleSheet1,
    getSampleStyleSheet,
    ParagraphStyle,
)
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate,
    Flowable,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
import os
from dataclasses import dataclass

ACCENT = HexColor("#0A0E12")
GOLD = HexColor("#B7890F")
GRAY = HexColor("#555F6B")

OUT_PATH = os.path.join(os.path.dirname(__file__), "sample-contract.pdf")


@dataclass(frozen=True)
class ContractParty:
    """A party named in a generated business agreement."""

    label: str
    name: str
    wallet_address: str


@dataclass(frozen=True)
class ContractSection:
    """One numbered prose section in the generated agreement."""

    title: str
    body: str


@dataclass(frozen=True)
class ContractTemplate:
    """Reusable contract template data suitable for PDF or text rendering."""

    agreement_id: str
    effective_date: str
    client: ContractParty
    freelancer: ContractParty
    escrow_amount: str
    arbitration_fee: str
    warranty_holdback: str
    acceptance_window: str
    sections: list[ContractSection]


def generate_contract_template(
    *,
    agreement_id: str = "TL-DEMO-0001",
    effective_date: str = "May 26, 2026",
    client: ContractParty | None = None,
    freelancer: ContractParty | None = None,
    scope_of_work: str | None = None,
    escrow_amount: str = "1.00 ETH",
    arbitration_fee: str = "5% (held only if a dispute is opened)",
    warranty_holdback: str = "10% for 30 days after approval",
    acceptance_window: str = "48 hours after work submission",
) -> ContractTemplate:
    """Return a realistic freelance service-agreement template.

    The template covers the clauses a TrustLedger workflow needs before funds
    are escrowed: parties, scope, payment, deliverables, deadlines,
    intellectual property, confidentiality, termination, dispute handling, and
    signatures. Callers can render it to PDF, markdown, or an uploaded document.

    Example:
        template = generate_contract_template(
            agreement_id="TL-2026-0042",
            client=ContractParty("Client", "Acme LLC", "0x..."),
            freelancer=ContractParty("Freelancer", "Jordan Rivera", "0x..."),
            scope_of_work="Build and document a Next.js dashboard.",
        )
    """
    resolved_client = client or ContractParty(
        "Client",
        "Acme Web Co.",
        "0xC1ie7700000000000000000000000000000000A1",
    )
    resolved_freelancer = freelancer or ContractParty(
        "Freelancer",
        "Jordan Rivera",
        "0xF7ee1a9c00000000000000000000000000000B2",
    )
    resolved_scope = scope_of_work or (
        "The Freelancer shall design and develop a responsive marketing landing "
        "page for the Client, comprising: (a) one desktop and one mobile layout; "
        "(b) a hero section, three feature blocks, a pricing table, and a contact "
        "form; (c) integration of the Client-supplied brand assets; and (d) "
        "deployment-ready source files. All deliverables shall be original work "
        "and free of third-party license encumbrances."
    )

    return ContractTemplate(
        agreement_id=agreement_id,
        effective_date=effective_date,
        client=resolved_client,
        freelancer=resolved_freelancer,
        escrow_amount=escrow_amount,
        arbitration_fee=arbitration_fee,
        warranty_holdback=warranty_holdback,
        acceptance_window=acceptance_window,
        sections=[
            ContractSection("1. Scope of Work", resolved_scope),
            ContractSection(
                "2. Payment &amp; Escrow",
                f"The Client shall lock the full Escrow Amount of {escrow_amount} in the "
                "TrustLedger smart contract upon acceptance of this agreement. Funds are "
                "released to the Freelancer automatically upon Client approval, or via "
                "decentralized juror arbitration in the event of a dispute. No platform "
                "fee is charged; the arbitration fee is collected only if a dispute is "
                "opened and is paid to the jurors who resolve it.",
            ),
            ContractSection(
                "3. Deliverables &amp; Deadlines",
                "The Freelancer shall submit the agreed deliverables before the project "
                "deadline stated in the TrustLedger escrow record. Each submission must "
                "include enough evidence for the Client to verify completion, such as "
                "source files, deployment links, reports, screenshots, or acceptance-test "
                "results.",
            ),
            ContractSection(
                "4. Delivery &amp; Acceptance",
                "Upon completion, the Freelancer submits proof of work on-chain. The "
                f"Client then has {acceptance_window} to approve or dispute the "
                "deliverable. If the Client takes no action within this window, the "
                "contract auto-releases the funds to the Freelancer as anti-ghosting "
                "protection.",
            ),
            ContractSection(
                "5. Intellectual Property",
                "After final payment is released, the Freelancer assigns to the Client "
                "all right, title, and interest in the specifically commissioned work "
                "product, excluding pre-existing tools, reusable libraries, portfolio "
                "know-how, and third-party materials governed by their own licenses.",
            ),
            ContractSection(
                "6. Confidentiality",
                "Each party shall protect non-public business, technical, financial, and "
                "customer information received from the other party and use it only to "
                "perform this agreement. This duty survives termination unless the "
                "information becomes public through no fault of the receiving party.",
            ),
            ContractSection(
                "7. Warranty Hold-Back",
                f"{warranty_holdback} of the Escrow Amount is withheld following Client "
                "approval. If a defect is identified during this period, the Client may "
                "request remediation. After the warranty period elapses, the Freelancer "
                "may claim the held-back amount.",
            ),
            ContractSection(
                "8. Termination",
                "Either party may terminate before funding by declining or cancelling the "
                "pending escrow. After funding, cancellation, reclaim, approval, dispute, "
                "and warranty outcomes are governed by the TrustLedger smart contract and "
                "the deadlines accepted by both parties.",
            ),
            ContractSection(
                "9. Dispute Resolution",
                "Should either party dispute the outcome, a panel of randomly selected, "
                "staked jurors evaluates the deliverable and votes on a completion "
                "percentage via a commit-reveal process. The median vote becomes the "
                "ruling, and the escrowed funds split proportionally between the parties.",
            ),
            ContractSection(
                "10. Integrity of This Document",
                "The keccak256 hash of this document is recorded on-chain at contract "
                "creation, and the file is pinned to IPFS. Any modification - even a "
                "single character - alters the hash and will not match the value "
                "stored on-chain. Both parties therefore hold cryptographic proof of the "
                "exact terms agreed.",
            ),
        ],
    )


def build_styles() -> StyleSheet1:
    """Define and return the custom paragraph styles used in the PDF.

    The returned stylesheet extends ReportLab's default sample styles with the
    following named styles:
        - DocTitle: Large, bold, accent-colored title for the document header.
        - Sub: Small, gray text for subtitles and disclaimers.
        - Section: Bold, accent-colored headings for each contract section.
        - Body2: Justified body text for the main content of each section.
        - SigLabel: Small, gray text for the signature-block labels.

    Returns:
        StyleSheet1: A ReportLab stylesheet keyed by style name, containing the
            default styles plus the custom styles listed above.
    """
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="DocTitle",
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=ACCENT,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Sub",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=GRAY,
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=ACCENT,
            spaceBefore=12,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body2",
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SigLabel",
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=GRAY,
        )
    )
    return styles


def main() -> None:
    """Build the sample freelance service agreement PDF and write it to disk.

    The content is entirely fictional and intended for demonstration only, but
    its structure and key terms mirror common freelance-contract practice and
    are tailored to showcase TrustLedger's escrow and arbitration features. The
    file is written to OUT_PATH (utils/sample-contract.pdf).

    Returns:
        None. The function writes the generated PDF to OUT_PATH as a side effect.
    """
    doc = SimpleDocTemplate(
        OUT_PATH,
        pagesize=LETTER,
        topMargin=0.9 * inch,
        bottomMargin=0.8 * inch,
        leftMargin=0.9 * inch,
        rightMargin=0.9 * inch,
        title="Freelance Service Agreement",
        author="TrustLedger Demo",
    )
    s = build_styles()
    template = generate_contract_template()
    # Flowable is the common base class for every element added below
    # (Paragraph, Spacer, Table, HRFlowable), and is what SimpleDocTemplate.build
    # expects, so the list is typed accordingly.
    flow: list[Flowable] = []

    flow.append(Paragraph("FREELANCE SERVICE AGREEMENT", s["DocTitle"]))
    flow.append(
        Paragraph(
            "Escrowed and arbitrated via TrustLedger - Ethereum Sepolia testnet",
            s["Sub"],
        )
    )
    flow.append(
        Paragraph(
            "DEMO DOCUMENT - not a legally binding contract. Fictional parties and values.",
            s["Sub"],
        )
    )
    flow.append(Spacer(1, 8))
    flow.append(HRFlowable(width="100%", thickness=1, color=GOLD))
    flow.append(Spacer(1, 10))

    terms = [
        ["Agreement ID", template.agreement_id],
        ["Effective Date", template.effective_date],
        ["Client", f"{template.client.name} ({template.client.wallet_address})"],
        ["Freelancer", f"{template.freelancer.name} ({template.freelancer.wallet_address})"],
        ["Escrow Amount", template.escrow_amount],
        ["Arbitration Fee", template.arbitration_fee],
        ["Warranty Hold-Back", template.warranty_holdback],
        ["Acceptance Window", template.acceptance_window],
    ]
    table = Table(terms, colWidths=[1.7 * inch, 4.6 * inch])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, -1), ACCENT),
                ("TEXTCOLOR", (1, 0), (1, -1), HexColor("#222A33")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, HexColor("#D6DCE3")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    flow.append(table)
    flow.append(Spacer(1, 6))

    for section in template.sections:
        flow.append(Paragraph(section.title, s["Section"]))
        flow.append(Paragraph(section.body, s["Body2"]))

    flow.append(Spacer(1, 22))

    # Signature block
    sig = [
        ["________________________", "________________________"],
        [
            f"{template.client.label} - {template.client.name}",
            f"{template.freelancer.label} - {template.freelancer.name}",
        ],
        ["Date: ____________________", "Date: ____________________"],
    ]
    sig_para = [[Paragraph(c, s["SigLabel"]) for c in row] for row in sig]
    sig_table = Table(sig_para, colWidths=[3.15 * inch, 3.15 * inch])
    sig_table.setStyle(
        TableStyle(
            [
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    flow.append(sig_table)

    doc.build(flow)
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
