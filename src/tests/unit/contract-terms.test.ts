import { convertContractTerms } from "@/app/[locale]/create/_lib/contractTerms";

describe("contract terms conversion", () => {
	it("escapes markdown content when converting to html", () => {
		const html = convertContractTerms(
			'# Scope <script>\n\n- Pay & approve "work"',
			"markdown",
			"html",
		);

		expect(html).toContain("<h1>Scope &lt;script&gt;</h1>");
		expect(html).toContain("<li>Pay &amp; approve &quot;work&quot;</li>");
		expect(html).not.toContain("<script>");
	});

	it("converts html to markdown without preserving tags or attributes", () => {
		const markdown = convertContractTerms(
			`<h1 class="x">Agreement</h1><p>Pay &amp; approve</p><ul><li data-id="1">Deliver</li></ul>`,
			"html",
			"markdown",
		);

		expect(markdown).toBe("# Agreement\nPay & approve\n- Deliver");
		expect(markdown).not.toContain("<h1");
		expect(markdown).not.toContain("data-id");
	});

	it("converts html to plain text with list markers and decoded entities", () => {
		const plain = convertContractTerms(
			"<h2>Evidence</h2><ul><li>Invoice &amp; receipt</li></ul>",
			"html",
			"plain",
		);

		expect(plain).toBe("Evidence\n- Invoice & receipt");
	});
});
