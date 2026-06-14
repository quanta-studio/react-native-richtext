# Phase 5b — Documentation Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a standalone Astro Starlight documentation site (text + code snippets, no screenshots) for `react-native-richtext`, plus an `llms.txt`, isolated from the library's build/test/release.

**Architecture:** A self-contained `docs-site/` Astro Starlight project (its own `package.json`, NOT a pnpm workspace member, ignored by the library's lint/format/test). MVP pages (Home, Getting Started, three Guides, two Reference pages) authored as MDX from the real public API. A dedicated `.github/workflows/docs.yml` builds and deploys to GitHub Pages. `public/llms.txt` is served at the site root.

**Tech Stack:** Astro 5 + `@astrojs/starlight`, MDX, GitHub Pages (Actions deploy), pnpm.

**Spec:** `docs/specs/2026-06-14-phase-5b-docs-site-design.md`

**Branch:** `phase-5b-docs-site` (already created; the spec commit is its first commit).

## Conventions / facts (use verbatim — do not invent)
- Package: `@yk-yong/react-native-richtext` (current 0.3.0; a11y 0.4.0 in flight). Sub-packages `-dom`/`-css`/`-core` are pulled transitively.
- Install: GitHub Packages. Consumer `.npmrc`: `@yk-yong:registry=https://npm.pkg.github.com` + `//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}` (PAT with `read:packages`).
- Peers: `react >=18.2.0`, `react-native >=0.74.0` (New Architecture).
- Public API: `RichText`; props `source`, `baseStyle`, `tagStyles`, `classStyles`, `renderers`, `fonts`, `onLinkPress`, `style`. Exports: `RichTextContext`, `useRichTextContext`, `defaultRenderers`, `splitStyle`, `resolveFont`; types `RichTextProps`, `Renderer`, `RendererProps`, `FontMap`, `FontFaces`, `RenderNode`, `RNStyle`. `FontMap = Record<string, Record<string, FontFaces>>`, `FontFaces = { normal?: string; italic?: string }`, `Renderer = ComponentType<RendererProps>`, `RendererProps = { node: RenderNode; children?: ReactNode }`.
- GitHub Pages URL base: owner `yk-yong`, repo `react-native-richtext` → `site: https://yk-yong.github.io`, `base: /react-native-richtext`.

## How to run things
- Docs build (from `docs-site/`): `pnpm install` then `pnpm build` and `pnpm check`. There are NO vitest tests for the site.
- The library gates (`pnpm test`/`typecheck`/`lint`/`format:check`/`build` at repo root) must stay green and must NOT touch `docs-site/`.

---

## File Structure

**Create (all under `docs-site/` unless noted):**
- `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/content.config.ts` — Starlight scaffold/config.
- `src/content/docs/index.mdx` — Home.
- `src/content/docs/getting-started.mdx`
- `src/content/docs/guides/styling.mdx`, `guides/custom-renderers.mdx`, `guides/fonts.mdx`
- `src/content/docs/reference/api.mdx`, `reference/supported-tags.mdx`
- `public/llms.txt`
- `.github/workflows/docs.yml` (repo root) — Pages deploy.

**Modify (repo root):**
- `.prettierignore` — add `docs-site/`.
- `eslint.config.*` (the eslint ignore list) — add `docs-site/`.

**Dependency order:** scaffold + isolation (Task 1) → content pages (Tasks 2–4) → llms.txt (Task 5) → deploy workflow + final verify (Task 6).

---

## Task 1: Scaffold `docs-site/` + isolate from library gates

**Files:** create `docs-site/{package.json,astro.config.mjs,tsconfig.json,src/content.config.ts,src/content/docs/index.mdx}`; modify root `.prettierignore` and the eslint ignore.

- [ ] **Step 1: Create `docs-site/package.json`**

```json
{
  "name": "react-native-richtext-docs",
  "type": "module",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "@astrojs/starlight": "^0.34.0",
    "astro": "^5.6.0",
    "sharp": "^0.34.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create `docs-site/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 3: Create `docs-site/astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://yk-yong.github.io',
  base: '/react-native-richtext',
  integrations: [
    starlight({
      title: 'react-native-richtext',
      description: 'Fabric-native HTML renderer for React Native.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/yk-yong/react-native-richtext',
        },
      ],
      sidebar: [
        { label: 'Getting Started', slug: 'getting-started' },
        {
          label: 'Guides',
          items: [
            { label: 'Styling', slug: 'guides/styling' },
            { label: 'Custom renderers', slug: 'guides/custom-renderers' },
            { label: 'Fonts', slug: 'guides/fonts' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API', slug: 'reference/api' },
            { label: 'Supported tags', slug: 'reference/supported-tags' },
          ],
        },
      ],
    }),
  ],
})
```

- [ ] **Step 4: Create `docs-site/src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
}
```

- [ ] **Step 5: Create a minimal `docs-site/src/content/docs/index.mdx` (placeholder home, replaced in Task 2)**

```mdx
---
title: react-native-richtext
description: Fabric-native HTML renderer for React Native.
---

Placeholder.
```

- [ ] **Step 6: Isolate `docs-site/` from the library gates**

Append `docs-site/` to the root `.prettierignore` (create the line if the file exists; if it doesn't exist, create `.prettierignore` containing `docs-site/`). Then add `'docs-site/**'` to the `ignores` of the root ESLint flat config (`eslint.config.js`/`.mjs` — find the config object with an `ignores` array and add the glob; if there is a top-level ignores entry like `{ ignores: [...] }`, add it there).

- [ ] **Step 7: Install and verify the scaffold builds**

Run (from `docs-site/`): `pnpm install` then `pnpm build`.
Expected: a successful Astro build producing `docs-site/dist/`.
> If `astro build` fails due to a Starlight config-API change in the resolved version (e.g. `social` shape, or content-collection loader), consult Starlight's "manual setup" docs and adjust ONLY `astro.config.mjs` / `src/content.config.ts` to match the installed version. The MDX content, `llms.txt`, and workflow in later tasks are version-independent. Report the adjustment as a concern.

- [ ] **Step 8: Verify library gates are unaffected**

Run from repo root: `pnpm format:check` and `pnpm lint`.
Expected: both pass and do NOT report files under `docs-site/` (confirms the ignores work). Also confirm `pnpm test` is unaffected (it only globs `packages/*/test/**`).

- [ ] **Step 9: Commit**

```bash
git add docs-site/package.json docs-site/astro.config.mjs docs-site/tsconfig.json docs-site/src/content.config.ts docs-site/src/content/docs/index.mdx docs-site/pnpm-lock.yaml .prettierignore eslint.config.*
git commit -m "docs(site): scaffold Astro Starlight docs-site, isolated from library gates"
```

---

## Task 2: Home + Getting Started pages

**Files:** overwrite `docs-site/src/content/docs/index.mdx`; create `docs-site/src/content/docs/getting-started.mdx`.

- [ ] **Step 1: Write the Home page** — overwrite `docs-site/src/content/docs/index.mdx`:

```mdx
---
title: react-native-richtext
description: A modern, Fabric-native HTML renderer for React Native.
---

A modern, **Fabric-native HTML renderer for React Native** — a community-maintained,
New-Architecture-first alternative to `react-native-render-html`.

It parses real HTML + CSS and renders native `<Text>`/`<View>`/`<Image>` — no WebView, no
`react-native-web`.

```tsx
import { RichText } from '@yk-yong/react-native-richtext'

;<RichText
  source={{ html: '<h1>Hello</h1><p>Rendered <strong>natively</strong>.</p>' }}
  baseStyle={{ fontSize: 16, color: '#1a1a1a' }}
  onLinkPress={(href) => console.log(href)}
/>
```

## Highlights

- **Full CSS engine** — inline styles, `tagStyles`/`classStyles`, `<style>` blocks, selectors,
  specificity, cascade, inheritance.
- **New Architecture only** — bare RN + Expo, Fabric/Yoga layout. No WebView, no web.
- **Override any tag** via the `renderers` prop, and per-weight font files via `fonts`.
- **Tables** with `colspan`/`rowspan` and content-measured column widths; **accessibility** roles
  for links, headings, and images.

See [Getting Started](/react-native-richtext/getting-started/) to install.
```

- [ ] **Step 2: Write Getting Started** — create `docs-site/src/content/docs/getting-started.mdx`:

```mdx
---
title: Getting Started
description: Install react-native-richtext and render your first HTML.
---

## Requirements

- React Native **≥ 0.74** with the **New Architecture (Fabric)** enabled — bare RN or Expo.
- React **≥ 18.2**.

## Install

The packages publish to **GitHub Packages** under the `@yk-yong` scope, so route that scope and
authenticate (GitHub Packages requires a token even for reads). Add an `.npmrc` at your app root:

```ini
@yk-yong:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Set `GITHUB_TOKEN` to a GitHub PAT with the `read:packages` scope (env var or CI secret — don't
commit it). Then install:

```bash
npm install @yk-yong/react-native-richtext
# pulls @yk-yong/react-native-richtext-{dom,css,core} transitively
```

It's a normal dependency resolved from `node_modules` — **no Metro config change** needed.

## First render

```tsx
import { SafeAreaView, ScrollView } from 'react-native'
import { RichText } from '@yk-yong/react-native-richtext'

const html = `
  <h1>react-native-richtext</h1>
  <p>A <strong>Fabric-native</strong> HTML renderer with <em>inline styles</em>,
     <a href="https://example.com">links</a>, and lists:</p>
  <ul><li>first item</li><li>second item</li></ul>
  <blockquote>A short quote &mdash; rendered natively.</blockquote>
`

export default function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <RichText
          source={{ html }}
          baseStyle={{ fontSize: 16, color: '#1a1a1a' }}
          onLinkPress={(href) => console.log('link:', href)}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
```

Next: [Styling](/react-native-richtext/guides/styling/) ·
[Custom renderers](/react-native-richtext/guides/custom-renderers/) ·
[API reference](/react-native-richtext/reference/api/).
```

- [ ] **Step 2 (verify): build**

Run (from `docs-site/`): `pnpm build` → success, no broken-link warnings for the links used.

- [ ] **Step 3: Commit**

```bash
git add docs-site/src/content/docs/index.mdx docs-site/src/content/docs/getting-started.mdx
git commit -m "docs(site): home and getting-started pages"
```

---

## Task 3: Guides (Styling, Custom renderers, Fonts)

**Files:** create `docs-site/src/content/docs/guides/{styling,custom-renderers,fonts}.mdx`.

- [ ] **Step 1: `guides/styling.mdx`**

```mdx
---
title: Styling
description: baseStyle, tagStyles, classStyles, and the CSS engine.
---

Styles come from four sources, applied with normal CSS cascade/specificity (UA < `baseStyle` <
`tagStyles` < `classStyles` < `<style>` blocks < inline `style`):

- **`baseStyle`** — defaults applied to the root (e.g. font size/color), inherited down.
- **`tagStyles`** — per-tag styles, keyed by tag name.
- **`classStyles`** — per-`class` styles, keyed by class name.
- **inline `style`** and **`<style>` blocks** in the HTML itself.

```tsx
<RichText
  source={{ html: '<p class="lead">Hello <em>world</em></p>' }}
  baseStyle={{ fontSize: 16, color: '#222' }}
  tagStyles={{ p: { marginBottom: 12 }, em: { color: '#b00' } }}
  classStyles={{ lead: { fontSize: 18, fontWeight: '600' } }}
/>
```

The CSS engine parses selectors, computes specificity, applies the cascade and inheritance, resolves
units (`em`/`rem`/`%`/unitless line-height), and maps declarations to React Native style objects.
Styles are RN style values, so use RN-supported properties (e.g. `marginBottom`, not `margin-bottom`
shorthands that RN can't express are dropped with a diagnostic).
```

- [ ] **Step 2: `guides/custom-renderers.mdx`**

```mdx
---
title: Custom renderers
description: Override how any tag renders via the renderers prop.
---

Every tag renders through a registry. Override or add one by passing `renderers` — a map of tag name
to a React component. Your renderer receives `RendererProps` (`{ node, children }`).

```tsx
import { RichText } from '@yk-yong/react-native-richtext'
import type { RendererProps } from '@yk-yong/react-native-richtext'
import { View } from 'react-native'

function Callout({ children }: RendererProps) {
  return <View style={{ padding: 12, backgroundColor: '#eef', borderRadius: 8 }}>{children}</View>
}

;<RichText source={{ html: '<aside>Heads up!</aside>' }} renderers={{ aside: Callout }} />
```

`children` is the already-rendered subtree. The `node` carries the tag, computed `style`, `attribs`,
and (for blocks) child nodes. Helpers `splitStyle` (partition an RN style into text vs view props)
and `resolveFont` are exported for building renderers that match the built-ins. The built-in map is
exported as `defaultRenderers` if you want to wrap rather than replace a renderer.
```

- [ ] **Step 3: `guides/fonts.mdx`**

```mdx
---
title: Fonts
description: Per-weight and per-style font-file resolution.
---

Many custom fonts ship as separate files per weight/style (e.g. `Montserrat-Regular`,
`Montserrat-Bold`, `Montserrat-Italic`). React Native often needs the **specific font file**, not
just `fontWeight`/`fontStyle`. The `fonts` prop maps a family + weight to the actual font file name.

```tsx
import type { FontMap } from '@yk-yong/react-native-richtext'

const fonts: FontMap = {
  Montserrat: {
    '400': { normal: 'Montserrat-Regular', italic: 'Montserrat-Italic' },
    '700': { normal: 'Montserrat-Bold', italic: 'Montserrat-BoldItalic' },
  },
}

;<RichText source={{ html }} baseStyle={{ fontFamily: 'Montserrat' }} fonts={fonts} />
```

When text resolves to a family/weight/style present in the map, the renderer swaps in the mapped
font file. `FontMap` is `Record<family, Record<weight, { normal?: string; italic?: string }>>`.
Families/weights not in the map fall back to RN's default `fontWeight`/`fontStyle` handling.
```

- [ ] **Step 4: build + commit**

Run (from `docs-site/`): `pnpm build` → success. Then:

```bash
git add docs-site/src/content/docs/guides
git commit -m "docs(site): styling, custom-renderers, and fonts guides"
```

---

## Task 4: Reference (API + Supported tags)

**Files:** create `docs-site/src/content/docs/reference/{api,supported-tags}.mdx`.

- [ ] **Step 1: `reference/api.mdx`**

```mdx
---
title: API
description: <RichText> props, exported helpers, and types.
---

## `<RichText>` props

| Prop          | Type                                   | Description                                                       |
| ------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `source`      | `{ html: string }`                     | The HTML to render. **Required.**                                |
| `baseStyle`   | `RNStyle`                              | Root styles, inherited down (e.g. font size/color).              |
| `tagStyles`   | `Record<string, RNStyle>`             | Per-tag styles, keyed by tag name.                               |
| `classStyles` | `Record<string, RNStyle>`             | Per-`class` styles, keyed by class name.                         |
| `renderers`   | `Record<string, Renderer>`            | Override/add a renderer for any tag.                             |
| `fonts`       | `FontMap`                              | Per-family/weight/style font-file map.                           |
| `onLinkPress` | `(href: string) => void`               | Called when an `<a>` is pressed.                                  |
| `style`       | `StyleProp<ViewStyle>`                 | Style for the outer container `View`.                            |

## Exports

- `RichText` — the component.
- `defaultRenderers` — the built-in tag→renderer map.
- `splitStyle(style)` — partition an `RNStyle` into `{ text, view }` props.
- `resolveFont(textStyle, fonts)` — apply the `fonts` map to a resolved text style.
- `RichTextContext`, `useRichTextContext` — the renderer context (registry, fonts, `onLinkPress`).

## Types

- `RichTextProps` — the props above.
- `Renderer = ComponentType<RendererProps>`
- `RendererProps = { node: RenderNode; children?: ReactNode }`
- `FontMap = Record<string, Record<string, FontFaces>>`, `FontFaces = { normal?: string; italic?: string }`
- `RenderNode` — a node in the styled render tree (block / inline / text / table / …).
- `RNStyle` — a curated subset of RN `TextStyle` & `ViewStyle`.
```

- [ ] **Step 2: `reference/supported-tags.mdx`**

```mdx
---
title: Supported tags
description: Which HTML tags render, and what's not yet supported.
---

## Inline

`b` · `strong` · `i` · `em` · `u` · `s` · `del` · `strike` · `ins` · `span` · `code` · `br` · `a`

Links (`a`) are pressable (`onLinkPress`) and announce as links to screen readers.

## Block

`p` · `div` · `h1`–`h6` · `ul` · `ol` · `li` · `blockquote` · `pre` · `hr`

Headings announce with the `header` accessibility role. Ordered/unordered lists render markers
(decimal, alpha, roman; `start`/`type`/`value` honored).

## Images

`img` — intrinsic-size aware; `alt` becomes the accessibility label (decorative no-`alt` images are
hidden from screen readers).

## Tables

`table` · `thead` · `tbody` · `tfoot` · `tr` · `td` · `th` · `caption` — including `colspan`/`rowspan`
(a normalized grid), content-measured column widths, and horizontal scroll when a table is wider than
its container. `<col width>` and cell widths are honored.

## Not yet supported

Forms/inputs, media (`audio`/`video`/`iframe`), `@media`/`@supports`, pseudo-elements, CSS
animations/transitions, and `react-native-web`. True vertical `rowspan` rendering and
`border-collapse` polish are in progress.
```

- [ ] **Step 3: build + commit**

Run (from `docs-site/`): `pnpm build` → success, no broken-link warnings. Then:

```bash
git add docs-site/src/content/docs/reference
git commit -m "docs(site): API and supported-tags reference"
```

---

## Task 5: `llms.txt`

**Files:** create `docs-site/public/llms.txt`.

- [ ] **Step 1: Create `docs-site/public/llms.txt`** (served at `/llms.txt`):

```text
# react-native-richtext

> Fabric-native HTML renderer for React Native — a New-Architecture-first alternative to
> react-native-render-html. Parses HTML + CSS and renders native Text/View/Image (no WebView, no web).

## Install
Published to GitHub Packages under the @yk-yong scope. App .npmrc:
  @yk-yong:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}   # PAT with read:packages
Then: npm install @yk-yong/react-native-richtext  (pulls -dom/-css/-core transitively)
Peers: react >=18.2, react-native >=0.74 (New Architecture).

## Usage
import { RichText } from '@yk-yong/react-native-richtext'
<RichText
  source={{ html }}
  baseStyle={{ fontSize: 16 }}
  tagStyles={{ p: { marginBottom: 12 } }}
  classStyles={{ note: { color: '#b00' } }}
  renderers={{ img: MyImage }}
  fonts={montserratFaces}
  onLinkPress={(href) => {}}
/>

## Props
- source: { html: string }  (required)
- baseStyle?: RNStyle        root styles, inherited
- tagStyles?: Record<tag, RNStyle>
- classStyles?: Record<class, RNStyle>
- renderers?: Record<tag, Renderer>   override any tag; Renderer = (props: { node, children }) => ReactNode
- fonts?: FontMap            Record<family, Record<weight, { normal?: string; italic?: string }>>
- onLinkPress?: (href: string) => void
- style?: ViewStyle          outer container

## Other exports
defaultRenderers, splitStyle(style)->{text,view}, resolveFont(text,fonts),
RichTextContext, useRichTextContext. Types: RichTextProps, Renderer, RendererProps, FontMap,
FontFaces, RenderNode, RNStyle.

## Supported tags
Inline: b strong i em u s del strike ins span code br a
Block: p div h1-h6 ul ol li blockquote pre hr
Images: img (alt -> a11y label)
Tables: table thead tbody tfoot tr td th caption (colspan/rowspan, measured column widths, h-scroll)
Accessibility: a->link, h1-h6->header, img->image roles.

## Not yet supported
Forms, media (audio/video/iframe), @media/@supports, pseudo-elements, CSS animations,
react-native-web. True vertical rowspan + border-collapse polish in progress.

## Links
Docs: https://yk-yong.github.io/react-native-richtext/
Repo: https://github.com/yk-yong/react-native-richtext
```

- [ ] **Step 2: Verify it's served**

Run (from `docs-site/`): `pnpm build` → confirm `docs-site/dist/llms.txt` exists (Astro copies `public/` to `dist/` root).

- [ ] **Step 3: Commit**

```bash
git add docs-site/public/llms.txt
git commit -m "docs(site): add llms.txt"
```

---

## Task 6: Deploy workflow + final verification

**Files:** create `.github/workflows/docs.yml` (repo root).

- [ ] **Step 1: Create `.github/workflows/docs.yml`**

```yaml
name: Docs

on:
  push:
    branches: [main]
    paths: ['docs-site/**', '.github/workflows/docs.yml']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    env:
      HUSKY: '0'
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 22

      - uses: pnpm/action-setup@v6
        with:
          version: 11.5.2
          standalone: true

      - name: Install
        run: pnpm install --frozen-lockfile
        working-directory: docs-site

      - name: Build
        run: pnpm build
        working-directory: docs-site

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs-site/dist

      - uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Final verification**

From `docs-site/`: `pnpm install` (ensures `pnpm-lock.yaml` is current/committed), `pnpm build`, and `pnpm check` (`astro check`) — all succeed; `astro check` reports no broken internal links.
From repo root: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — all exit 0 and none touch `docs-site/`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/docs.yml docs-site/pnpm-lock.yaml
git commit -m "ci: build and deploy docs site to GitHub Pages"
```

- [ ] **Step 4: Note for the repo owner**

GitHub Pages must be enabled once: repo Settings → Pages → Source = "GitHub Actions". After merge to `main`, the `Docs` workflow publishes to `https://yk-yong.github.io/react-native-richtext/`. (No changeset — `docs-site/` is not a published package.)

---

## Self-Review

**Spec coverage:**
- Standalone `docs-site/` Astro Starlight, not a workspace member, isolated from library gates → Task 1. ✅
- Text + code snippets only (no screenshots) → Tasks 2–4 (all content is prose + code). ✅
- MVP pages (Home, Getting Started, 3 guides, API + supported-tags) → Tasks 2–4. ✅
- `llms.txt` at site root → Task 5. ✅
- `docs.yml` GitHub Pages deploy, independent of library release → Task 6. ✅
- Verification via `astro build`/`check`; library gates green and untouched → Tasks 1 & 6. ✅

**Placeholder scan:** none — every file's full content is provided. (The Task 1 Step 5 `index.mdx` is an explicit, labeled placeholder that Task 2 overwrites — intentional, not a gap.)

**Type/fact consistency:** props, exports, types, install snippet, peer floors, and the Pages URL (`yk-yong.github.io/react-native-richtext`) match the spec and the real API. Sidebar `slug`s match the created file paths.

**Known fragility (flagged in Task 1 Step 7):** Astro/Starlight config API can shift between versions; only `astro.config.mjs`/`content.config.ts` are version-sensitive — the implementer adjusts them to the resolved version if `astro build` complains. All content/workflow files are version-independent.
