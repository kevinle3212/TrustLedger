import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from "@/lib/fetchTimeout";

interface GitHubRepositoryResponse {
	readonly full_name?: unknown;
	readonly html_url?: unknown;
	readonly private?: unknown;
	readonly stargazers_count?: unknown;
	readonly forks_count?: unknown;
	readonly watchers_count?: unknown;
	readonly open_issues_count?: unknown;
	readonly default_branch?: unknown;
	readonly pushed_at?: unknown;
	readonly size?: unknown;
}

interface GitHubContributorStatsResponse {
	readonly weeks?: readonly {
		readonly a?: unknown;
		readonly d?: unknown;
		readonly c?: unknown;
	}[];
}

interface GitHubAnalyticsSummary {
	readonly available: true;
	readonly repository: {
		readonly owner: string;
		readonly name: string;
		readonly fullName: string;
		readonly url: string;
		readonly defaultBranch: string;
		readonly pushedAt: string | null;
	};
	readonly metrics: {
		readonly commits: number | null;
		readonly pullRequests: number | null;
		readonly stars: number;
		readonly forks: number;
		readonly watchers: number;
		readonly openIssues: number;
		readonly repositorySizeKb: number;
		readonly additions: number | null;
		readonly deletions: number | null;
		readonly changedLines: number | null;
		readonly topLanguage: string | null;
		readonly languageCount: number;
	};
	readonly checkedAt: string;
}

interface GitHubAnalyticsUnavailable {
	readonly available: false;
	readonly reason: "missing_repo" | "invalid_repo" | "private_repo" | "fetch_failed";
	readonly checkedAt: string;
}

export type GitHubAnalyticsResult = GitHubAnalyticsSummary | GitHubAnalyticsUnavailable;

const GITHUB_API_BASE = "https://api.github.com";
const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedResult: { readonly value: GitHubAnalyticsResult; readonly expiresAt: number } | null =
	null;

function nowIso(): string {
	return new Date().toISOString();
}

function unavailable(reason: GitHubAnalyticsUnavailable["reason"]): GitHubAnalyticsUnavailable {
	return { available: false, reason, checkedAt: nowIso() };
}

function parseGitHubRepoUrl(value: string | undefined): { owner: string; repo: string } | null {
	if (value === undefined || value.trim() === "") return null;
	const trimmed = value.trim();
	const shorthandMatch = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/u.exec(trimmed);
	if (shorthandMatch !== null) {
		return {
			owner: shorthandMatch[1] ?? "",
			repo: (shorthandMatch[2] ?? "").replace(/\.git$/u, ""),
		};
	}

	try {
		const url = new URL(trimmed);
		if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;
		const [owner, repo] = url.pathname
			.replace(/^\/+?/u, "")
			.split("/")
			.map((segment) => segment.trim());
		if (owner === undefined || repo === undefined || owner === "" || repo === "") return null;
		return { owner, repo: repo.replace(/\.git$/u, "") };
	} catch {
		return null;
	}
}

function configuredRepo(): { owner: string; repo: string } | null {
	const owner = process.env["VERCEL_GIT_REPO_OWNER"];
	const slug = process.env["VERCEL_GIT_REPO_SLUG"];
	if (owner !== undefined && owner !== "" && slug !== undefined && slug !== "") {
		return { owner, repo: slug };
	}
	return parseGitHubRepoUrl(process.env.NEXT_PUBLIC_GITHUB_URL);
}

function requestHeaders(): HeadersInit {
	const headers: Record<string, string> = {
		"Accept": "application/vnd.github+json",
		"User-Agent": "TrustLedger-Public-Analytics",
		"X-GitHub-Api-Version": "2022-11-28",
	};
	const token = process.env.GITHUB_TOKEN;
	if (token !== undefined && token !== "") {
		headers["Authorization"] = `Bearer ${token}`;
	}
	return headers;
}

async function fetchGitHubJson(path: string): Promise<{ data: unknown; headers: Headers }> {
	const response = await fetchWithTimeout(
		`${GITHUB_API_BASE}${path}`,
		{ headers: requestHeaders() },
		REQUEST_TIMEOUT_MS.githubAnalytics,
	);
	if (!response.ok) {
		throw new Error(`GitHub request failed with ${response.status.toString()}`);
	}
	return { data: await response.json(), headers: response.headers };
}

function getLastPageCount(headers: Headers, fallbackCount: number): number {
	const link = headers.get("link");
	if (link === null || link === "") return fallbackCount;
	const match = /[?&]page=(\d+)>;\s*rel="last"/u.exec(link);
	return match === null ? fallbackCount : Number(match[1]);
}

function numberValue(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown, fallback: string): string {
	return typeof value === "string" && value !== "" ? value : fallback;
}

async function fetchPagedCount(path: string): Promise<number | null> {
	try {
		const { data, headers } = await fetchGitHubJson(
			`${path}${path.includes("?") ? "&" : "?"}per_page=1`,
		);
		return getLastPageCount(headers, Array.isArray(data) ? data.length : 0);
	} catch {
		return null;
	}
}

async function fetchLanguageSummary(
	owner: string,
	repo: string,
): Promise<{
	readonly topLanguage: string | null;
	readonly languageCount: number;
}> {
	try {
		const { data } = await fetchGitHubJson(`/repos/${owner}/${repo}/languages`);
		const languages = data as Record<string, number>;
		const entries = Object.entries(languages).sort(([, left], [, right]) => right - left);
		return {
			topLanguage: entries[0]?.[0] ?? null,
			languageCount: entries.length,
		};
	} catch {
		return { topLanguage: null, languageCount: 0 };
	}
}

async function fetchCodeChangeSummary(
	owner: string,
	repo: string,
): Promise<{
	readonly additions: number | null;
	readonly deletions: number | null;
	readonly changedLines: number | null;
}> {
	try {
		const response = await fetchWithTimeout(
			`${GITHUB_API_BASE}/repos/${owner}/${repo}/stats/contributors`,
			{ headers: requestHeaders() },
			REQUEST_TIMEOUT_MS.githubAnalytics,
		);
		if (response.status === 202) {
			return { additions: null, deletions: null, changedLines: null };
		}
		if (!response.ok) throw new Error(`GitHub stats failed with ${response.status.toString()}`);
		const contributors = (await response.json()) as GitHubContributorStatsResponse[];
		const additions = contributors.reduce(
			(total, contributor) =>
				total +
				(contributor.weeks ?? []).reduce((sum, week) => sum + numberValue(week.a), 0),
			0,
		);
		const deletions = contributors.reduce(
			(total, contributor) =>
				total +
				(contributor.weeks ?? []).reduce((sum, week) => sum + numberValue(week.d), 0),
			0,
		);
		return { additions, deletions, changedLines: additions + deletions };
	} catch {
		return { additions: null, deletions: null, changedLines: null };
	}
}

async function buildGitHubAnalytics(): Promise<GitHubAnalyticsResult> {
	const repoConfig = configuredRepo();
	if (repoConfig === null) return unavailable("missing_repo");
	const { owner, repo } = repoConfig;
	if (owner === "" || repo === "") return unavailable("invalid_repo");

	try {
		const { data } = await fetchGitHubJson(`/repos/${owner}/${repo}`);
		const repository = data as GitHubRepositoryResponse;
		if (repository.private !== false) return unavailable("private_repo");

		const [commits, pullRequests, languages, codeChanges] = await Promise.all([
			fetchPagedCount(`/repos/${owner}/${repo}/commits`),
			fetchPagedCount(`/repos/${owner}/${repo}/pulls?state=all`),
			fetchLanguageSummary(owner, repo),
			fetchCodeChangeSummary(owner, repo),
		]);

		return {
			available: true,
			repository: {
				owner,
				name: repo,
				fullName: stringValue(repository.full_name, `${owner}/${repo}`),
				url: stringValue(repository.html_url, `https://github.com/${owner}/${repo}`),
				defaultBranch: stringValue(repository.default_branch, "main"),
				pushedAt:
					typeof repository.pushed_at === "string" && repository.pushed_at !== ""
						? repository.pushed_at
						: null,
			},
			metrics: {
				commits,
				pullRequests,
				stars: numberValue(repository.stargazers_count),
				forks: numberValue(repository.forks_count),
				watchers: numberValue(repository.watchers_count),
				openIssues: numberValue(repository.open_issues_count),
				repositorySizeKb: numberValue(repository.size),
				additions: codeChanges.additions,
				deletions: codeChanges.deletions,
				changedLines: codeChanges.changedLines,
				topLanguage: languages.topLanguage,
				languageCount: languages.languageCount,
			},
			checkedAt: nowIso(),
		};
	} catch {
		return unavailable("fetch_failed");
	}
}

export async function getGitHubAnalytics(): Promise<GitHubAnalyticsResult> {
	const now = Date.now();
	if (cachedResult !== null && cachedResult.expiresAt > now) return cachedResult.value;
	const value = await buildGitHubAnalytics();
	cachedResult = { value, expiresAt: now + CACHE_TTL_MS };
	return value;
}
