# Release 0.1.0 runbook (first publish)

> **Superseded — historical.** This describes the original `@yk-yong` → GitHub Packages release.
> The project has since moved to the `quanta-studio` org and publishes to the **public npm
> registry**; see [`docs/npm-publish-runbook.md`](./npm-publish-runbook.md).

The first publish of the four packages at `0.1.0`, to **GitHub Packages**
(`https://npm.pkg.github.com`, owner `yk-yong`). Versioning/build/pack are prepared in this repo;
the **publish step needs a token** (there is no registry auth in the dev environment).

Registry wiring (already in the repo): each package has
`publishConfig.registry = https://npm.pkg.github.com` + a `repository` field, and
`.github/workflows/release.yml` is set up with `registry-url`/`scope` + `packages: write` and
authenticates via the workflow's built-in `GITHUB_TOKEN`.

## Prerequisites / decisions

1. **Merge PR #6 (Phase 3b polish) first** so 0.1.0 includes it. (Otherwise 0.1.0 ships Phases 0–3a and
   the polish follows as 0.1.1 — valid, just less complete.)
2. **Phase 0 packaging follow-ups** (`docs/phase-0-followups.md`, items 1–5) were marked "resolve before
   first publish". They affect **only `node16`/`nodenext` consumers** — RN/Metro/bundler/node10 (the
   actual targets, incl. the dogfood app) resolve fine. Decide:
   - **Ship 0.1.0 now** with the documented `node16` `.d.ts` caveat (fine for the RN target), fix in 0.1.1; or
   - **Fix first** (its own small cycle): switch to `moduleResolution: NodeNext` + extensioned imports (or
     ship ESM-only), emit a CJS `.d.cts`, add an `engines` field, and wire `@arethetypeswrong/cli`
     `--pack` into CI. Recommended before a _widely-consumed_ release; optional for a first canary.
3. **Auth**: the `release.yml` workflow uses the built-in `GITHUB_TOKEN` (no secret to set) — it
   publishes on push to `main` via `changeset publish`. To publish locally instead, create a GitHub
   PAT with the `write:packages` scope and put it in your `~/.npmrc` (see Step C).

## Steps

### A. Version (prepared on a release branch; I run these)

```bash
# from a release branch off the FINAL main (after PR #6 merge)
pnpm changeset version     # consumes the 6 changesets, bumps all 4 packages 0.0.0 -> 0.1.0,
                           # writes CHANGELOG.md, rewrites workspace:* deps to ^0.1.0
pnpm install               # refresh the lockfile for the new versions
git add -A && git commit -m "chore: version packages for 0.1.0 release"
```

A `dom` changeset is already added (`.changeset/dom-initial-release.md`) so all four packages reach
`0.1.0` together.

### B. Verify the build + tarballs

```bash
pnpm build                 # tsup (esm+cjs) + tsc -b (.d.ts) for all 4
for p in dom css core react-native; do (cd packages/$p && npm pack --dry-run); done
# confirm each tarball includes dist/ + README + LICENSE, and that the published deps
# (@quanta-studio/react-native-richtext-* in css/core/react-native) are real ^0.1.0 ranges, not workspace:*
```

### C. Publish to GitHub Packages

Pick one:

- **CI (recommended)**: merge the release/version commit to `main`.
  `.github/workflows/release.yml` runs `changeset publish` and publishes the bumped packages to
  GitHub Packages, authenticating with the built-in `GITHUB_TOKEN`. **No secret to set.**
- **Local**: add a GitHub PAT (`write:packages` scope) to `~/.npmrc`, then publish from the repo
  root. The packages' `publishConfig.registry` already points at GitHub Packages.

  ```bash
  # ~/.npmrc
  //npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
  ```

  ```bash
  pnpm -r publish --no-git-checks   # or: pnpm changeset publish
  # publish order doesn't matter — the ^0.1.0 inter-deps resolve from the same registry
  ```

### D. Tag & verify

```bash
git push --follow-tags        # changeset version created the git tags
```

Verify on the repo's **Packages** page (github.com/quanta-studio/react-native-richtext → Packages), or, with the
`~/.npmrc` token set:

```bash
npm view @quanta-studio/react-native-richtext --registry=https://npm.pkg.github.com version   # 0.1.0
```

Then the dogfood (`docs/dogfood-migration-plan.md`) can install `@quanta-studio/react-native-richtext@0.1.0` once
its app `.npmrc` routes the `@yk-yong` scope to GitHub Packages (see that doc's Step 1).

## What I've prepared in this branch

- `.changeset/dom-initial-release.md` — so `dom` joins the 0.1.0 release.
- `docs/dogfood-migration-plan.md` — the seed → library migration guide.
- This runbook.

The `changeset version` + build + pack-verify (steps A–B) are ready to run the moment PR #6 is merged
and the packaging-follow-up decision is made — say the word and I'll execute them on a release branch
and hand you the exact publish command for step C.
