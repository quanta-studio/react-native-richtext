# Release 0.1.0 runbook (first publish)

The first npm publish of the four packages at `0.1.0`. Versioning/build/pack are prepared in this
repo; the **`npm publish` step needs your credentials** (there is no npm auth in the dev
environment).

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
3. **NPM token**: either set the `NPM_TOKEN` GitHub Actions secret (the `release.yml` workflow then
   publishes on push to `main` via `changeset publish`), or publish locally with your own `npm login`.

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
# (@yk-yong/rn-rich-text-* in css/core/react-native) are real ^0.1.0 ranges, not workspace:*
```

### C. Publish (your credentials)

Pick one:

- **CI (recommended)**: set the `NPM_TOKEN` repo secret, then merge the release/version commit to
  `main`. `.github/workflows/release.yml` runs `changeset publish` and publishes the bumped packages.
- **Local**: with `npm login` done, from the repo root run `pnpm -r publish --access public` (or
  `pnpm changeset publish`). Publish order doesn't matter — npm resolves the `^0.1.0` inter-deps.

### D. Tag & verify

```bash
git push --follow-tags                       # changeset version created the git tags
npm view @yk-yong/rn-rich-text version        # should report 0.1.0
```

Then the dogfood (`docs/dogfood-migration-plan.md`) can `npm install @yk-yong/rn-rich-text@0.1.0`.

## What I've prepared in this branch

- `.changeset/dom-initial-release.md` — so `dom` joins the 0.1.0 release.
- `docs/dogfood-migration-plan.md` — the seed → library migration guide.
- This runbook.

The `changeset version` + build + pack-verify (steps A–B) are ready to run the moment PR #6 is merged
and the packaging-follow-up decision is made — say the word and I'll execute them on a release branch
and hand you the exact publish command for step C.
