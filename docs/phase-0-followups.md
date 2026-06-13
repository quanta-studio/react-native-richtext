# Phase 0 — deferred follow-ups (resolve before the first npm publish)

Phase 0's deliverable (a tested, React-free `@yk-yong/react-native-richtext-dom` package + green CI) is
complete and merged. These items are **not** blockers for Phase 0 — the package resolves
correctly for `bundler` and `node10` module resolution, which covers every real current
consumer: the in-repo Phase 1/2 packages (built under `moduleResolution: Bundler`) and
RN/Metro/Vite/esbuild apps. The items below only affect **published** consumers using
`node16`/`nodenext` resolution, and Phase 0 does not publish (packages are `0.0.0`; the release
workflow is inert until `NPM_TOKEN` is set).

Surfaced by the final whole-implementation review (verified with `tsc` + `@arethetypeswrong/cli`).

## 1. Published `.d.ts` is broken under `node16`/`nodenext` resolution

`tsconfig.base.json` uses `"moduleResolution": "Bundler"`, so `tsc` emits the barrel
re-exports **without file extensions** (`export * from './guards'`). A consumer compiling under
`moduleResolution: node16`/`nodenext` (TS-recommended for a `type: module` package with an
`exports` map) gets `TS2834` ("Relative import paths need explicit file extensions") on the
package's own `dist/index.d.ts`, cascading into `TS2305` for every export. `attw` reports
`node16 (from ESM) 🥴 Internal resolution error`.

**Fix options (pick one, apply repo-wide so all packages share the pattern):**

- Switch the source to `moduleResolution: NodeNext` + add explicit `.js` extensions to all
  relative imports (the standard ESM-library setup). Vitest/tsup/esbuild already resolve
  `.js`→`.ts`. This makes `tsc` emit extensioned re-exports.
- Or roll up declarations with a bundler that writes extensions (e.g. `tsup` `dts: true`, once
  its declaration build is reconciled with our `composite` tsconfig and TypeScript 6 — note:
  as of tsup 8.5.1 + TS 6.0.3 this currently errors with `TS6307` against composite projects
  and `TS5101` baseUrl deprecation).
- Or ship **ESM-only** (drop CJS) — simplest; also resolves item 2.

## 2. Dual ESM/CJS package ships only one ESM-flavored `.d.ts` (FalseESM for `require`)

`package.json` `exports.require` → `dist/index.cjs`, but both conditions point `types` at the
single ESM-syntax `dist/index.d.ts`. `attw` reports `node16 (from CJS) 👺 Masquerading as ESM`.

**Fix:** emit a CJS declaration (`dist/index.d.cts`) and point the `require` condition's `types`
at it:

```json
"exports": {
  ".": {
    "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
  }
}
```

Or drop CJS and go ESM-only (see item 1).

## 3. Add a types/packaging regression guard to CI

Wire `@arethetypeswrong/cli --pack` (and/or `publint`) into `ci.yml` so items 1–2 cannot
regress and so the package is verified publishable on every PR. Do this together with the fix
above so CI goes (and stays) green.

## 4. Minor: dangling declaration source maps

`dist/*.d.ts.map` ship in the tarball but `src/` does not, so the maps reference sources that
aren't published. Either exclude `*.d.ts.map` from the published files or include `src/`.

## 5. Minor: `engines` on the published package

The root `engines: { node: ">=20.18.0" }` does not propagate to the published
`@yk-yong/react-native-richtext-dom`. Consider adding an `engines` field to the package itself.
