import { readFileSync } from "node:fs";

const docsBaseUrl = "https://kevinle3212.github.io/TrustLedger";
const repoDocsUrl = "https://github.com/kevinle3212/TrustLedger/tree/main/docs";

function topLevelNavItems(mkdocsYaml) {
	const nav = mkdocsYaml.match(/^nav:\n([\s\S]*?)\n\ndocs_dir:/m)?.[1] ?? "";
	return nav
		.split("\n")
		.map((line) => line.match(/^\s{4}-\s+([^:]+):\s+(.+\.md)$/))
		.filter((match) => match !== null)
		.map((match) => {
			const [, title, file] = match;
			const slug = file.replace(/\.md$/, "/").replace(/index\/$/, "");
			return { title: title.trim(), url: `${docsBaseUrl}/${slug}` };
		});
}

const items = topLevelNavItems(readFileSync("mkdocs.yml", "utf8"));

console.log("# TrustLedger Documentation");
console.log("");
console.log(
	`Canonical documentation is maintained in the repository [docs/](${repoDocsUrl}) folder`,
);
console.log(`and published as rendered pages at <${docsBaseUrl}>.`);
console.log("");
console.log("Use the rendered pages below instead of raw wiki Markdown copies.");
console.log("");
console.log("## Table Of Contents");
console.log("");

for (const item of items) {
	console.log(`- [${item.title}](${item.url})`);
}
