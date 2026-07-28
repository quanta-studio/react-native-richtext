# react-native-richtext — Phase 5 (sub-project 5b): Documentation site

Date: 2026-06-14
Status: Draft for review
Depends on: Phases 0–5a — all merged and shipped (0.3.0 / 0.4.0 a11y in flight).

## What this is

The library has almost no documentation today: ~7-line package READMEs, a 28-line root README, and a
single-screen Expo example. 5b builds a real **documentation site** so the library is discoverable
and adoptable — a static **Astro Starlight** site (text + code snippets), deployed to **GitHub
Pages**, plus an **`llms.txt`** for LLM consumption.

Deliberately **text + code-snippets only** — no screenshots in 5b (images can be added later by
dropping files in and referencing them). No `react-native-web` / live in-browser examples (the
library is New-Architecture/RN-only, no web). The site is a separate static project that never
affects the library's build, tests, or release.

## Decisions locked during brainstorming (do not re-litigate)

| Question     | Decision                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Approach     | Static docs site, **text + code snippets only** (no screenshots in 5b; no live/RNW rendering).                                                   |
| Generator    | **Astro Starlight** (lean, MDX, built-in pagefind search, easy GitHub Pages deploy).                                                             |
| Location     | A **standalone `docs-site/` project** — its own `package.json`, **not** a pnpm workspace member, so its deps don't bloat the library install/CI. |
| Isolation    | `docs-site/` is excluded from the library's lint/format/test/typecheck so library gates never trip on it.                                        |
| LLM docs     | Ship an **`llms.txt`** (llmstxt.org convention) served at the site root — a self-contained concise reference an LLM can use.                     |
| Deploy       | A dedicated **`.github/workflows/docs.yml`** builds + deploys to GitHub Pages on push to `main` touching `docs-site/**`.                         |
| Verification | `astro build` (+ `astro check` for broken internal links). No vitest — docs are content/tooling.                                                 |

## 1. Project layout — `docs-site/` (standalone)

A minimal hand-authored Astro Starlight project (no interactive scaffolder):

```
docs-site/
  package.json            # astro + @astrojs/starlight; scripts: dev/build/check
  astro.config.mjs        # Starlight integration; site + base set for GitHub Pages
  tsconfig.json           # astro/tsconfigs/base
  src/
    content/
      docs/
        index.mdx         # Home
        getting-started.mdx
        guides/styling.mdx
        guides/custom-renderers.mdx
        guides/fonts.mdx
        reference/api.mdx
        reference/supported-tags.mdx
    content.config.ts     # Starlight docs collection
  public/
    llms.txt              # served at /llms.txt
```

Not added to `pnpm-workspace.yaml`. Root `.prettierignore` and the eslint ignore list gain
`docs-site/`; the root `tsconfig`/vitest already only cover `packages/*`, so no change needed there
(confirm during planning). The library's `ci.yml`/`release.yml` are untouched.

## 2. Information architecture (MVP pages)

- **Home (`index.mdx`)** — one-paragraph pitch (Fabric-native `react-native-render-html`
  replacement), install line, a ~10-line `<RichText source={{ html }} />` snippet, links into the
  guides/reference. Starlight splash or doc layout.
- **Getting Started** — install incl. the **GitHub Packages `.npmrc`** snippet (the scope is on
  GitHub Packages, not npm), peer-dependency floors (`react` ≥ 18.2, `react-native` ≥ 0.74,
  New-Arch), a first working render, and the "link locally during dev" note.
- **Guides**
  - _Styling_ — `baseStyle` / `tagStyles` / `classStyles`, `<style>` blocks, and the CSS-engine
    capabilities (selectors, specificity, cascade, inheritance, units) at a high level.
  - _Custom renderers_ — overriding any tag via the `renderers` prop (`RendererProps`, the registry,
    `splitStyle` helper); a worked `img`/`a` example.
  - _Fonts_ — the per-weight/style **font-file resolution** (`FontMap`/`FontFaces`, `resolveFont`),
    why emphasis selects a font _file_ (the Montserrat insight).
- **Reference**
  - _API_ — `<RichText>` props table (`source`, `baseStyle`, `tagStyles`, `classStyles`,
    `renderers`, `fonts`, `onLinkPress`, `style`) each with type + a short example; exported helpers
    (`defaultRenderers`, `splitStyle`, `resolveFont`) and types (`RichTextProps`, `Renderer`,
    `RendererProps`, `FontMap`, `FontFaces`, `RenderNode`, `RNStyle`).
  - _Supported tags_ — a matrix: inline (`b strong i em u s del strike ins span code br a`), block
    (`p div h1–h6 ul ol li blockquote pre hr`), `img`, tables (`table thead tbody tfoot tr td th
caption`, colspan/rowspan, measured widths), with a11y notes (link/header/image roles) and a
    "not yet" column (forms, media, `@media`).

Content is sourced from the real public API (`RichTextProps` + exported types), the UA stylesheet,
and shipped phases (0–5a). No invented APIs; all snippets are copy-paste runnable.

## 3. `llms.txt`

A single `public/llms.txt` following the llmstxt.org convention, served at `/llms.txt`. Self-
contained enough that an LLM can use the library from it alone:

- H1 title + blockquote one-line summary.
- Install (GitHub Packages `.npmrc` + `pnpm add`), peer-dep floors.
- Minimal usage snippet.
- The `<RichText>` props (name — type — purpose) and exported helpers/types.
- Supported-tags list + current limitations.
- Links to the hosted doc pages.

(An `llms-full.txt` with the full concatenated docs is a possible later addition; 5b ships the
curated `llms.txt`.)

## 4. Deploy — `.github/workflows/docs.yml`

A standalone workflow: `on: push: branches: [main]` with `paths: ['docs-site/**']` (plus
`workflow_dispatch`). Steps: checkout → setup-node 22 + pnpm (standalone, matching the other
workflows) → `cd docs-site && pnpm install` → `pnpm build` → upload + deploy via
`actions/deploy-pages`. Permissions `pages: write` + `id-token: write`; `concurrency` group so
deploys don't overlap. `astro.config.mjs` sets `site: 'https://quanta-studio.github.io'` and
`base: '/react-native-richtext'` for project-Pages URLs. (Repo owner enables Pages → "GitHub
Actions" source once.)

## 5. Verification

- `cd docs-site && pnpm build` succeeds; `pnpm check` (`astro check`) passes (Starlight reports
  broken internal links / invalid frontmatter).
- The library's `pnpm test` / `typecheck` / `lint` / `format:check` / `build` remain green and do not
  touch `docs-site/` (ignored).
- No vitest tests for the site (it's content/tooling).

## Deliverable

A deployed Astro Starlight docs site (Home, Getting Started, three guides, API + supported-tags
reference) at the GitHub Pages URL, plus a `/llms.txt`. Library build/test/release unaffected. Text +
code snippets; no screenshots.

## Out of scope (this cycle → later)

- Screenshot images (slots/refs can be added later by dropping files in).
- Live in-browser examples via `react-native-web`.
- A `react-native-render-html` migration guide; exhaustive per-tag pages; a cookbook.
- `llms-full.txt`; versioned docs; i18n; custom search tuning; custom theme/branding.
- API reference auto-generation (TypeDoc) — hand-written for MVP.
- Publishing the example app to Expo / web.

## Open questions (resolve during planning)

- Exact GitHub Pages URL base (`/react-native-richtext`) — confirm repo name/owner for `astro.config`
  `site`/`base`.
- Whether to also wire a `docs-site` build check into the library `ci.yml` (lean: keep it only in
  `docs.yml`, so library PRs aren't gated on docs).
- Astro/Starlight pinned versions (resolve to current stable at implementation; lockfile committed in
  `docs-site/`).
- Whether `docs-site/` needs its own `.npmrc` (it consumes only public npm deps — Astro/Starlight —
  so no GitHub Packages scope needed; the GH Packages `.npmrc` is only documented for _consumers_).
