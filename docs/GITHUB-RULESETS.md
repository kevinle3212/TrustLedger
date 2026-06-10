# GitHub Rulesets

<a id="top"></a>

<!-- docs-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->
- [Sensitive File Protection](#sensitive-file-protection)
- [Required Repository Settings](#required-repository-settings)
- [Local And CI Backstops](#local-and-ci-backstops)
<!-- docs-toc:end -->

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

GitHub rulesets are the server-side backstop for mistakes that local Git hooks
cannot stop, including `git commit --no-verify`, direct CLI pushes, and forced
push attempts.

## Sensitive File Protection

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

The importable ruleset template lives at:

```txt
.github/rulesets/protect-sensitive-files.json
```

It blocks pushes that try to add or modify high-risk paths such as:

- `.env` and `.env.*`, except example files through local guard policy.
- `target/deploy/*.json`.
- `*keypair*.json` and `*-keypair.json`.
- Secret JSON/YAML files.
- Private-key-looking filenames.

The template also enables secret-scanning push protection where the repository
plan supports it. Repository admins should import or recreate this ruleset in
GitHub Settings -> Rules -> Rulesets and keep enforcement set to active.

## Required Repository Settings

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

Enable these GitHub settings:

- Secret scanning.
- Push protection.
- Push ruleset with file path restrictions from
  `.github/rulesets/protect-sensitive-files.json`.
- No bypass actors for the sensitive-file ruleset unless an emergency breakglass
  process is documented separately.

GitHub can reject protected file paths server-side. That is the closest practical
answer to "never under any circumstances," because local hooks can always be
bypassed by a user with their own Git client.

## Local And CI Backstops

<!-- docs-section-nav:start -->
[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)
<!-- docs-section-nav:end -->

The repository also runs:

```sh
npm run secrets:check
```

This guard checks tracked and staged files for forbidden paths and common secret
content. It runs in pre-commit, pre-push, `npm run quality`, and CI.
