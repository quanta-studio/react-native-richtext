# npm publish runbook (`@quanta-studio` scope, public npm)

The project lives at **`github.com/quanta-studio/react-native-richtext`** and publishes the four
packages to the **public npm registry** under the **`@quanta-studio`** scope:

| Package                                     | Current version |
| ------------------------------------------- | --------------- |
| `@quanta-studio/react-native-richtext-dom`  | 0.1.0           |
| `@quanta-studio/react-native-richtext-css`  | 0.2.1           |
| `@quanta-studio/react-native-richtext-core` | 0.3.1           |
| `@quanta-studio/react-native-richtext`      | 0.4.1           |

These are **new package names** — nothing under `@quanta-studio` has been published yet. Versions
carry over from the old `@yk-yong` GitHub Packages releases so the CHANGELOGs stay meaningful; npm
has no history to conflict with.

## What is already wired in the repo

- Each `packages/*/package.json` has `publishConfig` = `{ access: "public", registry:
"https://registry.npmjs.org" }`, plus `repository` (with `directory`), `homepage`, and `bugs`.
- `.changeset/config.json` has `"access": "public"`.
- `.github/workflows/release.yml` publishes on merge to `main` via `changesets/action` →
  `pnpm release` (`pnpm build && changeset publish`). **There is no npm token anywhere** — CI
  authenticates with **npm trusted publishing (OIDC)**.

## How the CI credential works (no token)

npm enforces 2FA on publish even for access tokens, so a stored `NPM_TOKEN` is not a viable CI
credential. Trusted publishing replaces it: the workflow proves its identity to npm with a GitHub
Actions OIDC id-token and receives a short-lived, single-purpose registry token in exchange.

The pinned **pnpm 11.5.2 implements this natively** — it does not delegate to the npm CLI, so the
runner's npm version is irrelevant. The chain, all inside `pnpm publish`:

1. `getIdToken` — reads `ACTIONS_ID_TOKEN_REQUEST_URL` / `..._TOKEN`, which exist only because the
   job declares `permissions: id-token: write`.
2. `fetchAuthToken` — `POST /-/npm/v1/oidc/token/exchange/package/<name>` on the registry, bearing
   that id-token, and gets back a publish token. **Note the endpoint is per package** — every one
   of the four packages needs its own trusted-publisher entry.
3. `determineProvenance` — derives provenance from the same id-token, so attestation is automatic.

Three consequences worth knowing before editing the workflow:

- **Do not set `NPM_CONFIG_PROVENANCE`.** pnpm only calls `determineProvenance` when the option is
  left unset (`if (options.provenance != null) return { authToken, provenance: options.provenance }`).
- **Do not give `actions/setup-node` a `registry-url`/`scope`.** That writes an `.npmrc` line
  `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}`; pnpm merges registry auth with `??=`, so a
  present-but-empty `_authToken` would take precedence over the OIDC token and the publish would 401. `publishConfig.registry` already pins the registry per package.
- **OIDC failure is silent.** Both `getIdToken` and `fetchAuthToken` errors are caught and logged as
  `Skipped OIDC: …`, then publishing falls through to ordinary auth. With no token configured that
  surfaces later as a confusing `ENEEDAUTH`/401 — so when a release fails, **grep the job log for
  `Skipped OIDC`** first; the real cause is on that line.

Changesets itself needs no credential: its `getTokenIsRequired` 2FA probe is skipped whenever stdin
is not a TTY, which is always the case in CI.

## One-time setup

1. **Create the npm org.** Log in at npmjs.com and create the **`quanta-studio`** organization
   (free tier is fine for public packages). Without it, publishing a `@quanta-studio/*` package
   fails with `E404 Scope not found`.
2. **Push the repo to the new remote.** `origin` already points at
   `git@github.com:quanta-studio/react-native-richtext.git`; the repo must exist under the org and
   be **public** (provenance attestation requires a public repo).
3. **Bootstrap publish — see below.** A trusted publisher is configured on a package's settings
   page, so the package has to exist on npm first. The very first publish of each of the four
   packages is therefore manual.
4. **Configure the trusted publisher** on each of the four packages: npmjs.com → package →
   Settings → **Trusted Publisher** → GitHub Actions, with
   - Organization/repository: `quanta-studio/react-native-richtext`
   - Workflow filename: `release.yml`
   - Environment: leave empty (the job does not use a GitHub environment)

   Repeat for `-dom`, `-css`, `-core`, and the umbrella package. Miss one and only that package
   fails to publish, mid-release, leaving the set partially published.

## Bootstrap: the first publish of each package

Publish once from your machine with an interactive OTP, in dependency order. Do them one at a time
with a **fresh** OTP each — a single `-r` run reuses one code across four requests and will fail
partway once it expires.

```bash
npm login                      # account must be a member of the quanta-studio org
pnpm build

cd packages/dom          && pnpm publish --no-git-checks --otp=<code> && cd -
cd packages/css          && pnpm publish --no-git-checks --otp=<code> && cd -
cd packages/core         && pnpm publish --no-git-checks --otp=<code> && cd -
cd packages/react-native && pnpm publish --no-git-checks --otp=<code> && cd -
```

These four publishes are **not** provenance-attested — provenance requires the Actions OIDC token.
Every release after this one goes through CI and is attested. Once all four exist on npm, do setup
step 4, and never publish manually again.

## Release flow (normal path)

1. Record the change: `pnpm changeset` → pick packages + bump type, write the changelog entry.
2. Open a PR, merge to `main`.
3. The Release workflow opens a **"Version Packages"** PR (versions + CHANGELOGs).
4. Merge that PR. The workflow runs again, builds, and publishes the bumped packages to npm with
   provenance, then pushes git tags.

Note the `HUSKY: '0'` env in the workflow: commitlint would otherwise reject the bot's
"Version Packages" commit and fail the release.

Confirm the OIDC path actually engaged: the publish step's log should **not** contain
`Skipped OIDC`, and the packages should show the "Provenance" panel on their npm pages.

## Smoke check

After a successful run:

```bash
npm view @quanta-studio/react-native-richtext version
npm view @quanta-studio/react-native-richtext dist-tags
```

Then verify a clean consumer install resolves all four packages:

```bash
cd "$(mktemp -d)" && npm init -y >/dev/null
npm install @quanta-studio/react-native-richtext
ls node_modules/@quanta-studio   # react-native-richtext{,-core,-css,-dom}
```

## Manual publish (fallback, if CI is unavailable)

```bash
npm login                       # account must be a member of the quanta-studio org
pnpm build
pnpm changeset version          # if versions are not already bumped
pnpm changeset publish --otp=<code>
git push --follow-tags
```

Manual publishes are **not** provenance-attested, and a single OTP across several packages may
expire mid-run. Prefer the CI path.

## Constraint on the pnpm version

Trusted publishing here is a **pnpm** feature, not an npm-CLI one. `.github/workflows/release.yml`
pins `pnpm/action-setup` to **11.5.2**; if you bump that pin, re-confirm the OIDC code path still
exists (`releasing/commands/lib/publish/oidc/`), and never drop below a version that has it — the
failure mode is a silent `Skipped OIDC` followed by an auth error, not a clear message.

## Troubleshooting

| Symptom                          | Cause / fix                                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Skipped OIDC: …` in the job log | The real error, always check first. Missing `id-token: write`, no trusted publisher for that package, or a pnpm too old to support OIDC. |
| `E404 Scope not found`           | The `quanta-studio` npm org does not exist yet — create it (setup step 1).                                                               |
| `E402 Payment Required`          | Scoped package defaulted to private; `publishConfig.access: "public"` must be present.                                                   |
| `E401` / `ENEEDAUTH` in CI       | OIDC did not engage — see the `Skipped OIDC` row. Also check nothing reintroduced a `registry-url` on `setup-node`.                      |
| Only some packages published     | A trusted publisher is configured per package; the ones that failed are missing their entry. Add it and re-run the workflow.             |
| Published but no provenance      | `NPM_CONFIG_PROVENANCE` got set, which suppresses pnpm's auto-determination; or the GitHub repo is private.                              |
| Provenance URL mismatch          | `repository.url` in a package.json does not match the actual GitHub repo.                                                                |
