const originalEnv = process.env;
const originalFetch = globalThis.fetch;

function jsonResponse(
	body: unknown,
	init: { readonly status?: number; readonly headers?: Record<string, string> } = {},
): Response {
	const status = init.status ?? 200;
	const headers = new Map<string, string>(
		Object.entries({ "content-type": "application/json", ...(init.headers ?? {}) }),
	);
	return {
		ok: status >= 200 && status < 300,
		status,
		headers: {
			get(name: string): string | null {
				return headers.get(name.toLowerCase()) ?? null;
			},
		},
		async json(): Promise<unknown> {
			await Promise.resolve();
			return body;
		},
	} as Response;
}

describe("github analytics", () => {
	afterEach(() => {
		process.env = originalEnv;
		globalThis.fetch = originalFetch;
		jest.restoreAllMocks();
		jest.resetModules();
	});

	it("rejects missing and non-GitHub repository references", async () => {
		globalThis.fetch = jest.fn();
		const { getGitHubAnalytics } = await import("@/services/githubAnalytics");

		process.env = { ...originalEnv, NEXT_PUBLIC_GITHUB_URL: "" };
		await expect(getGitHubAnalytics()).resolves.toMatchObject({
			available: false,
			reason: "missing_repo",
		});
		expect(globalThis.fetch).not.toHaveBeenCalled();

		jest.resetModules();
		const invalidModule = await import("@/services/githubAnalytics");
		process.env = {
			...originalEnv,
			NEXT_PUBLIC_GITHUB_URL: "https://gitlab.com/example/project",
		};
		await expect(invalidModule.getGitHubAnalytics()).resolves.toMatchObject({
			available: false,
			reason: "missing_repo",
		});
		expect(globalThis.fetch).not.toHaveBeenCalled();
	});

	it("suppresses private repositories", async () => {
		process.env = { ...originalEnv, NEXT_PUBLIC_GITHUB_URL: "https://github.com/acme/private" };
		globalThis.fetch = jest
			.fn()
			.mockResolvedValue(jsonResponse({ private: true, full_name: "acme/private" }));

		const { getGitHubAnalytics } = await import("@/services/githubAnalytics");
		await expect(getGitHubAnalytics()).resolves.toMatchObject({
			available: false,
			reason: "private_repo",
		});
	});

	it("returns public repository metrics", async () => {
		process.env = { ...originalEnv, NEXT_PUBLIC_GITHUB_URL: "acme/public.git" };
		globalThis.fetch = jest
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({
					private: false,
					full_name: "acme/public",
					html_url: "https://github.com/acme/public",
					stargazers_count: 12,
					forks_count: 3,
					watchers_count: 4,
					open_issues_count: 2,
					default_branch: "main",
					pushed_at: "2026-06-10T12:00:00Z",
					size: 2048,
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse([], {
					headers: {
						link: '<https://api.github.com/repositories/1/commits?per_page=1&page=44>; rel="last"',
					},
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse([], {
					headers: {
						link: '<https://api.github.com/repositories/1/pulls?state=all&per_page=1&page=7>; rel="last"',
					},
				}),
			)
			.mockResolvedValueOnce(jsonResponse({ TypeScript: 100, Solidity: 25 }))
			.mockResolvedValueOnce(
				jsonResponse([
					{ weeks: [{ a: 10, d: 4, c: 2 }] },
					{ weeks: [{ a: 5, d: 1, c: 1 }] },
				]),
			);

		const { getGitHubAnalytics } = await import("@/services/githubAnalytics");
		await expect(getGitHubAnalytics()).resolves.toMatchObject({
			available: true,
			repository: { fullName: "acme/public", defaultBranch: "main" },
			metrics: {
				commits: 44,
				pullRequests: 7,
				stars: 12,
				forks: 3,
				watchers: 4,
				openIssues: 2,
				repositorySizeKb: 2048,
				additions: 15,
				deletions: 5,
				changedLines: 20,
				topLanguage: "TypeScript",
				languageCount: 2,
			},
		});
	});
});
