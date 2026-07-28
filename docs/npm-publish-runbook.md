# npm publish runbook (`@quanta-studio` scope, public npm)

The project lives at **`github.com/quanta-studio/react-native-richtext`** and publishes the four
packages to the **public npm registry** under the **`@quanta-studio`** scope:

| Package                                     | Published version |
| ------------------------------------------- | ----------------- |
| `@quanta-studio/react-native-richtext-dom`  | 0.1.0             |
| `@quanta-studio/react-native-richtext-css`  | 0.2.1             |
| `@quanta-studio/react-native-richtext-core` | 0.3.1             |
| `@quanta-studio/react-native-richtext`      | 0.4.1             |

All four are **live on npm** as of 2026-07-28, published manually as the bootstrap release (see
[Bootstrap](#bootstrap-the-first-publish-of-each-package-done)). Versions carried over from the old
`@yk-yong` GitHub Packages releases so the CHANGELOGs stay meaningful; the new names had no npm
history to conflict with.

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

1. ~~**Create the npm org** `quanta-studio`.~~ Done. Without it, publishing a `@quanta-studio/*`
   package fails with `E404 Scope not found`.
2. ~~**Repo public at `quanta-studio/react-native-richtext`.**~~ Done. Must stay public —
   provenance attestation requires it.
3. ~~**Bootstrap publish.**~~ Done, see below.
4. **Configure the trusted publisher — one entry per package.** ← the remaining step.

   npmjs.com → package → Settings → **Trusted Publisher** → GitHub Actions, with
   - Organization/repository: `quanta-studio/react-native-richtext`
   - Workflow filename: `release.yml`
   - Environment: leave empty (the job does not use a GitHub environment)

   **All four packages need their own entry** — `-dom`, `-css`, `-core`, and the umbrella. This is
   not a per-repo or per-scope setting: the token exchange is
   `POST /-/npm/v1/oidc/token/exchange/package/<escapedName>`, called once per package with a token
   scoped to that name alone. Configure only the umbrella and a release that bumps `-css` fails on
   `-css` after the others have already gone out — a partial release, announced only by a
   `Skipped OIDC` line and a downstream `ENEEDAUTH`.

## Bootstrap: the first publish of each package (done)

Recorded because it is the procedure to repeat for any **new** package added to the workspace: a
trusted publisher can only be configured on a package that already exists on npm, so every new
package's first publish is manual.

The account (`john-yk`) has `tfa.mode = auth-and-writes` with a **security key**, not TOTP. Two
consequences that dictate the whole procedure:

- **`--otp=<code>` is useless** — there is no code to type. npm authenticates a security key through
  a browser WebAuthn flow, and it only offers that flow when **stdin is a TTY**. Run it
  non-interactively and npm skips straight to `npm error code EOTP`, asking for a code that cannot
  exist. So this must be run by a human in a real terminal; an agent or CI shell cannot do it.
- **`pnpm publish` cannot do it at all.** pnpm drives `libnpmpublish` directly and never implements
  npm's browser-based WebAuthn handshake, so it fails with `EOTP` regardless of TTY.

The way through is to split the two jobs: let **pnpm** build the publishable manifest, and let the
**npm CLI** do the authenticated upload.

```bash
# 1. From a clean, merged main — the published artifact should match a real commit.
git checkout main && git pull --ff-only
pnpm clean && pnpm install --frozen-lockfile && pnpm build

# 2. pnpm pack rewrites `workspace:*` deps to exact versions. npm does NOT understand that
#    protocol, so `npm publish` inside a package dir would ship unresolvable ranges.
mkdir -p /tmp/packs
for d in dom css core react-native; do (cd "packages/$d" && pnpm pack --pack-destination /tmp/packs); done

# 3. Verify no `workspace:` survived into any tarball manifest before uploading.
for f in /tmp/packs/*.tgz; do tar -xOf "$f" package/package.json | grep -q 'workspace:' && echo "LEAK: $f"; done

# 4. Upload the tarballs with npm, in dependency order, from a real terminal.
#    One security-key touch per package. `&&` stops at the first failure, so a problem
#    leaves a clean prefix rather than a scattered partial release.
cd /tmp/packs \
  && npm publish quanta-studio-react-native-richtext-dom-0.1.0.tgz  --access public \
  && npm publish quanta-studio-react-native-richtext-css-0.2.1.tgz  --access public \
  && npm publish quanta-studio-react-native-richtext-core-0.3.1.tgz --access public \
  && npm publish quanta-studio-react-native-richtext-0.4.1.tgz      --access public
```

Bootstrap publishes are **not** provenance-attested — provenance requires the Actions OIDC token,
which exists only in CI. Once the package exists, do setup step 4 for it and let CI publish from
then on.

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

Then verify a clean-room consumer install really resolves the whole graph from the registry:

```bash
cd "$(mktemp -d)" && npm init -y >/dev/null
npm install @quanta-studio/react-native-richtext
ls node_modules/@quanta-studio   # react-native-richtext{,-core,-css,-dom}

# inter-package deps must be exact versions, never `workspace:*`
node -e 'const fs=require("fs");for(const p of fs.readdirSync("node_modules/@quanta-studio")){const j=JSON.parse(fs.readFileSync(`node_modules/@quanta-studio/${p}/package.json`,"utf8"));console.log(j.name,j.version,JSON.stringify(j.dependencies||{}))}'

# both module systems load the real entrypoints
node -e 'console.log(Object.keys(require("@quanta-studio/react-native-richtext-dom")).length,"CJS exports")'
node --input-type=module -e 'import * as m from "@quanta-studio/react-native-richtext-css"; console.log(Object.keys(m).length,"ESM exports")'
```

Do **not** probe with `require.resolve("@quanta-studio/react-native-richtext/package.json")` — the
`exports` map deliberately does not expose `./package.json`, so that throws
`ERR_PACKAGE_PATH_NOT_EXPORTED` and looks like a broken package when nothing is wrong. Read the
manifest from disk instead, as above.

## Manual publish (fallback, if CI is unavailable)

`pnpm changeset publish` **will not work** from a developer machine here — it shells out to
`pnpm publish`, which cannot perform the security-key WebAuthn handshake and dies with `EOTP`.

Bump versions with changesets, then upload with npm using the pack-then-publish procedure above:

```bash
pnpm changeset version          # if versions are not already bumped
pnpm build
# then steps 2-4 of Bootstrap, with the version numbers in the filenames updated
git push --follow-tags
```

Manual publishes are **not** provenance-attested and must be run from a real terminal by someone
holding the security key. Prefer the CI path.

## Constraint on the pnpm version

Trusted publishing here is a **pnpm** feature, not an npm-CLI one. `.github/workflows/release.yml`
pins `pnpm/action-setup` to **11.5.2**; if you bump that pin, re-confirm the OIDC code path still
exists (`releasing/commands/lib/publish/oidc/`), and never drop below a version that has it — the
failure mode is a silent `Skipped OIDC` followed by an auth error, not a clear message.

## Troubleshooting

| Symptom                                       | Cause / fix                                                                                                                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Skipped OIDC: …` in the job log              | The real error, always check first. Missing `id-token: write`, no trusted publisher for that package, or a pnpm too old to support OIDC.                                                                               |
| `npm error code EOTP` on a manual publish     | Security key needs npm's browser WebAuthn flow, which npm only offers when stdin is a TTY. Run it yourself in a real terminal — not via an agent, script, or CI shell. `--otp=` cannot help; there is no code to type. |
| `EOTP` from `pnpm publish` even in a terminal | pnpm never implements the WebAuthn handshake. Use `pnpm pack` + `npm publish <tarball>` instead.                                                                                                                       |
| `EPUBLISHCONFLICT`                            | That exact version is already on npm. Published versions are immutable — bump and republish, never try to overwrite.                                                                                                   |
| `E404 Scope not found`                        | The `quanta-studio` npm org does not exist yet — create it (setup step 1).                                                                                                                                             |
| `E402 Payment Required`                       | Scoped package defaulted to private; `publishConfig.access: "public"` must be present.                                                                                                                                 |
| `E401` / `ENEEDAUTH` in CI                    | OIDC did not engage — see the `Skipped OIDC` row. Also check nothing reintroduced a `registry-url` on `setup-node`.                                                                                                    |
| Only some packages published                  | A trusted publisher is configured per package; the ones that failed are missing their entry. Add it and re-run the workflow.                                                                                           |
| Published but no provenance                   | `NPM_CONFIG_PROVENANCE` got set, which suppresses pnpm's auto-determination; or the GitHub repo is private.                                                                                                            |
| Provenance URL mismatch                       | `repository.url` in a package.json does not match the actual GitHub repo.                                                                                                                                              |
