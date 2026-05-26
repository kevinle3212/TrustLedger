"""Generates a dummy freelance service agreement PDF for TrustLedger demos.

The output PDF is meant to be uploaded as the "Contract Document" when creating
an escrow on TrustLedger. Its keccak256 hash is stored on-chain (contractHash)
and the file itself is pinned to IPFS (contractURI). Any later edit to the file
changes the hash and fails the on-chain match.

Usage:
    python3 demo/generate_contract.py
Output:
    demo/sample-contract.pdf
"""

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
import os

ACCENT = HexColor("#0A0E12")
GOLD = HexColor("#B7890F")
GRAY = HexColor("#555F6B")

OUT_PATH = os.path.join(os.path.dirname(__file__), "sample-contract.pdf")


def build_styles():
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


def main():
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
    flow = []

    flow.append(Paragraph("FREELANCE SERVICE AGREEMENT", s["DocTitle"]))
    flow.append(
        Paragraph(
            "Escrowed and arbitrated via TrustLedger &mdash; Ethereum Sepolia testnet",
            s["Sub"],
        )
    )
    flow.append(
        Paragraph(
            "DEMO DOCUMENT &mdash; not a legally binding contract. Fictional parties and values.",
            s["Sub"],
        )
    )
    flow.append(Spacer(1, 8))
    flow.append(HRFlowable(width="100%", thickness=1, color=GOLD))
    flow.append(Spacer(1, 10))

    # Parties / terms table
    terms = [
        ["Agreement ID", "TL-DEMO-0001"],
        ["Effective Date", "May 26, 2026"],
        ["Client", "Acme Web Co. (0xC1ie7700000000000000000000000000000000A1)"],
        ["Freelancer", "Jordan Rivera (0xF7ee1a9c00000000000000000000000000000B2)"],
        ["Escrow Amount", "1.00 ETH"],
        ["Arbitration Fee", "5% (held only if a dispute is opened)"],
        ["Warranty Hold-Back", "10% for 30 days after approval"],
        ["Acceptance Window", "48 hours after work submission"],
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

    sections = [
        (
            "1. Scope of Work",
            "The Freelancer shall design and develop a responsive marketing landing "
            "page for the Client, comprising: (a) one desktop and one mobile layout; "
            "(b) a hero section, three feature blocks, a pricing table, and a contact "
            "form; (c) integration of the Client-supplied brand assets; and (d) "
            "deployment-ready source files. All deliverables shall be original work "
            "and free of third-party license encumbrances.",
        ),
        (
            "2. Payment &amp; Escrow",
            "The Client shall lock the full Escrow Amount of 1.00 ETH in the "
            "TrustLedger smart contract upon creation of this agreement. Funds are "
            "released to the Freelancer automatically upon Client approval, or via "
            "decentralized juror arbitration in the event of a dispute. No platform "
            "fee is charged; the arbitration fee is collected only if a dispute is "
            "opened and is paid to the jurors who resolve it.",
        ),
        (
            "3. Delivery &amp; Acceptance",
            "Upon completion, the Freelancer submits proof of work on-chain. The "
            "Client then has 48 hours to approve or dispute the deliverable. If the "
            "Client takes no action within this window, the contract auto-releases "
            "the funds to the Freelancer (anti-ghosting protection).",
        ),
        (
            "4. Dispute Resolution",
            "Should either party dispute the outcome, a panel of randomly selected, "
            "staked jurors evaluates the deliverable and votes on a completion "
            "percentage via a commit-reveal process. The median vote becomes the "
            "ruling, and the escrowed funds split proportionally between the parties.",
        ),
        (
            "5. Warranty Hold-Back",
            "10% of the Escrow Amount is withheld for 30 days following Client "
            "approval. If a defect is identified during this period, the Client "
            "retains leverage to seek remediation. After the warranty period elapses, "
            "the Freelancer may claim the held-back amount.",
        ),
        (
            "6. Integrity of This Document",
            "The keccak256 hash of this document is recorded on-chain at contract "
            "creation, and the file is pinned to IPFS. Any modification &mdash; even a "
            "single character &mdash; alters the hash and will not match the value "
            "stored on-chain. Both parties therefore hold cryptographic proof of the "
            "exact terms agreed.",
        ),
    ]
    for title, body in sections:
        flow.append(Paragraph(title, s["Section"]))
        flow.append(Paragraph(body, s["Body2"]))

    flow.append(Spacer(1, 22))

    # Signature block
    sig = [
        ["________________________", "________________________"],
        ["Client &mdash; Acme Web Co.", "Freelancer &mdash; Jordan Rivera"],
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
