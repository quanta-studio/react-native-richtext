# Phase 0 — Foundation + `@yk-yong/rn-rich-text-dom` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the public pnpm monorepo (tooling, CI, governance) and ship a tested, React-free `@yk-yong/rn-rich-text-dom` package that parses HTML → a queryable DOM with traversal helpers and typed node guards.

**Architecture:** A pnpm-workspaces monorepo with TypeScript project references. `tsc -b` owns type-checking and `.d.ts` emit; `tsup` (esbuild) owns ESM+CJS JS bundles. The only Phase 0 package, `packages/dom`, is a thin, well-tested wrapper that promotes the proven `htmlparser2`/`domhandler`/`domutils` substrate into a curated public API (`parse`, guards, query helpers, types). No React, no RN, no CSS.

**Tech Stack:** pnpm workspaces · TypeScript 5 (project references) · tsup · Vitest · ESLint 9 (flat config) + Prettier · Changesets · Husky + commitlint · GitHub Actions · `htmlparser2` + `domhandler` + `domutils` + `domelementtype`.

---

## Decisions locked during planning

| Question | Decision |
| --- | --- |
| Package manager / workspaces | **pnpm workspaces** |
| Test runner (React-free pkgs) | **Vitest** |
| Build tool | **tsup** for JS (ESM+CJS); `tsc -b` for `.d.ts` + project-reference type graph |
| npm scope / naming | Scope **`@yk-yong`**, packages prefixed **`rn-rich-text-`**. Phase 0 ships `@yk-yong/rn-rich-text-dom`. Future: `…-css`, `…-core`, and the umbrella RN package `@yk-yong/rn-rich-text`. Rename later with a repo-wide find/replace. |
| `selectAll(sel)` in `dom` | **Deferred to Phase 1 (`@scope/css`).** Selector matching needs `css-select`, which the spec assigns to the CSS engine. Phase 0 exposes `domutils` traversal only. |
| RN/React peer floors | **Not applicable to Phase 0** — no React/RN package yet. Resolve in Phase 2. |
| `img` in v1 (Phase 2 vs 3) | **Out of scope for Phase 0.** Resolve when Phase 2/3 specs are written. |

## File structure (created by this plan)

```
rn-rich-text/
├─ package.json                      # root, private, workspace orchestrator + scripts
├─ pnpm-workspace.yaml               # packages: ['packages/*']
├─ .npmrc                            # pnpm settings
├─ .nvmrc                            # node version pin
├─ .gitignore
├─ tsconfig.base.json                # shared strict compiler options
├─ tsconfig.json                     # root solution; references packages/dom
├─ eslint.config.mjs                 # ESLint 9 flat config
├─ .prettierrc.json
├─ .prettierignore
├─ vitest.config.ts                  # root test config (scans packages/*/test)
├─ commitlint.config.mjs
├─ .husky/commit-msg                 # runs commitlint
├─ .changeset/config.json
├─ .changeset/README.md
├─ LICENSE                           # MIT
├─ README.md
├─ CONTRIBUTING.md
├─ .github/
│  ├─ workflows/ci.yml               # lint + typecheck + test + build on PR/push
│  ├─ workflows/release.yml          # Changesets release (inert until NPM_TOKEN set)
│  ├─ PULL_REQUEST_TEMPLATE.md
│  └─ ISSUE_TEMPLATE/{bug_report,feature_request}.md
├─ example/README.md                 # stub; real Expo app wired in Phase 2
└─ packages/dom/
   ├─ package.json
   ├─ tsconfig.json                  # composite, emitDeclarationOnly, src only
   ├─ tsconfig.test.json             # noEmit, src + test (typecheck tests)
   ├─ tsup.config.ts                 # JS only (dts:false)
   ├─ README.md
   ├─ src/
   │  ├─ index.ts                    # public barrel
   │  ├─ parse.ts                    # parse(html) → Document
   │  ├─ guards.ts                   # isTag/isText/… re-exports
   │  ├─ query.ts                    # domutils traversal re-exports
   │  └─ types.ts                    # domhandler node type re-exports
   └─ test/
      ├─ parse.test.ts
      ├─ guards.test.ts
      └─ query.test.ts
```

**Dependency versions:** every install below uses `pnpm add` **without a version**, so pnpm pins the latest compatible release at implementation time. Snippets that show `package.json` use `^`-ranges as illustrative placeholders — your resolved versions may differ; that is expected, commit whatever pnpm writes.

---

## Task 1: Root workspace + Git ignore + Node/pnpm pinning

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`, `.gitignore`

- [ ] **Step 1: Enable corepack/pnpm**

Run: `corepack enable && corepack prepare pnpm@latest --activate`
Expected: prints the activated pnpm version. Then `pnpm -v` prints `10.x` (or newer).

- [ ] **Step 2: Create the root `package.json`**

Create `package.json`:

```json
{
  "name": "rn-rich-text",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Fabric-native HTML renderer for React Native (monorepo root).",
  "license": "MIT",
  "packageManager": "pnpm@10.12.1",
  "engines": { "node": ">=20.18.0" },
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
}
```

> Note: keep `packageManager` in sync with the version `pnpm -v` prints; update the string if it differs. Scripts grow in later tasks.

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 4: Create `.npmrc`**

```
engine-strict=true
auto-install-peers=true
```

- [ ] **Step 5: Create `.nvmrc`**

```
22
```

- [ ] **Step 6: Create `.gitignore`**

```gitignore
node_modules/
dist/
coverage/
*.tsbuildinfo
*.log
pnpm-debug.log*
.DS_Store
.idea/
.vscode/
.husky/_/
```

- [ ] **Step 7: Install (creates the lockfile)**

Run: `pnpm install`
Expected: completes with no errors; creates `pnpm-lock.yaml`. `only-allow` permits the install because it ran under pnpm.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm workspace root"
```

---

## Task 2: TypeScript base config + root solution

**Files:**
- Create: `tsconfig.base.json`, `tsconfig.json`

- [ ] **Step 1: Add TypeScript**

Run: `pnpm add -D -w typescript`
Expected: adds `typescript` to root `devDependencies`.

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "moduleDetection": "force",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

> Deliberately **no DOM lib** — these are React-free, browser-free packages, so global `Document`/`Element`/`window` must not leak in. Our public node types come from `domhandler`, not the DOM.

- [ ] **Step 3: Create the root solution `tsconfig.json`**

```json
{
  "files": [],
  "references": []
}
```

> The `packages/dom` reference is added in Task 6 once that project exists; referencing a missing path would break `tsc -b`.

- [ ] **Step 4: Verify the compiler runs**

Run: `pnpm exec tsc --version`
Expected: prints `Version 5.x`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add shared TypeScript config and root solution"
```

---

## Task 3: Prettier

**Files:**
- Create: `.prettierrc.json`, `.prettierignore`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Add Prettier**

Run: `pnpm add -D -w prettier`

- [ ] **Step 2: Create `.prettierrc.json`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 3: Create `.prettierignore`**

```
node_modules
dist
coverage
pnpm-lock.yaml
.changeset
```

- [ ] **Step 4: Add format scripts to root `package.json`**

Add these keys inside `"scripts"` (alongside `preinstall`):

```json
    "format": "prettier --write .",
    "format:check": "prettier --check ."
```

- [ ] **Step 5: Format the repo, then verify it is clean**

Run: `pnpm format && pnpm format:check`
Expected: `format` rewrites files; `format:check` then prints `All matched files use Prettier code style!` and exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add Prettier config and format scripts"
```

---

## Task 4: ESLint (flat config)

**Files:**
- Create: `eslint.config.mjs`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Add ESLint and plugins**

Run: `pnpm add -D -w eslint @eslint/js typescript-eslint eslint-config-prettier globals`

- [ ] **Step 2: Create `eslint.config.mjs`**

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '.husky/**', 'pnpm-lock.yaml'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  prettier,
)
```

> Uses the non-type-checked `recommended` preset — fast, and no per-file `tsconfig` wiring. Type-aware linting can be added in a later phase.

- [ ] **Step 3: Add lint scripts to root `package.json`**

Add inside `"scripts"`:

```json
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
```

- [ ] **Step 4: Verify lint passes**

Run: `pnpm lint`
Expected: exits 0 with no errors (only config files exist so far).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add ESLint flat config"
```

---

## Task 5: Vitest + tsup + build/test/clean scripts

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Add test and build tooling**

Run: `pnpm add -D -w vitest @vitest/coverage-v8 tsup rimraf`

- [ ] **Step 2: Create root `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/index.ts', '**/types.ts'],
    },
  },
})
```

> `index.ts`/`types.ts` are pure re-export barrels, excluded from coverage. No thresholds in Phase 0 (add later once the corpus exists).

- [ ] **Step 3: Add the remaining root scripts to `package.json`**

Add inside `"scripts"`:

```json
    "build": "pnpm -r run build && tsc -b",
    "typecheck": "pnpm -r run typecheck",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "clean": "pnpm -r run clean && rimraf '**/*.tsbuildinfo'"
```

> Build order matters: `pnpm -r run build` runs each package's `tsup` (JS, cleans its own `dist`) **first**, then `tsc -b` emits `.d.ts` into the same `dist` dirs. `typecheck` runs each package's own `tsc` (which also covers test files). Both `pnpm -r run …` calls are no-ops until `packages/dom` defines those scripts in Task 6.

- [ ] **Step 4: Verify the runners resolve**

Run: `pnpm exec vitest --version && pnpm exec tsup --version`
Expected: prints a Vitest 3.x version and a tsup version. (Do **not** run `pnpm test` yet — there are no tests; Vitest would exit non-zero.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Vitest, tsup, and workspace build/test scripts"
```

---

## Task 6: `@yk-yong/rn-rich-text-dom` package skeleton (types-only barrel)

**Files:**
- Create: `packages/dom/package.json`, `packages/dom/tsconfig.json`, `packages/dom/tsconfig.test.json`, `packages/dom/tsup.config.ts`, `packages/dom/README.md`, `packages/dom/src/types.ts`, `packages/dom/src/index.ts`
- Modify: `tsconfig.json` (root — add the project reference)

- [ ] **Step 1: Create `packages/dom/package.json`**

```json
{
  "name": "@yk-yong/rn-rich-text-dom",
  "version": "0.0.0",
  "description": "Forgiving HTML → DOM parsing, traversal, and node guards for rn-rich-text. React-free.",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc -p tsconfig.test.json",
    "clean": "rimraf dist"
  },
  "publishConfig": { "access": "public" },
  "keywords": ["html", "parser", "dom", "react-native", "rich-text"]
}
```

- [ ] **Step 2: Create `packages/dom/tsconfig.json` (build/types + project ref)**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist",
    "emitDeclarationOnly": true,
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src"]
}
```

> `emitDeclarationOnly` — `tsc -b` writes `.d.ts` only; `tsup` writes the JS. They share `dist/` without colliding (`.d.ts` vs `.js`/`.cjs`). `include: ["src"]` keeps tests out of the published types.

- [ ] **Step 3: Create `packages/dom/tsconfig.test.json` (typecheck incl. tests)**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "noEmit": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: Create `packages/dom/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
})
```

> `dts: false` — declarations come from `tsc -b`, not tsup.

- [ ] **Step 5: Create `packages/dom/README.md`**

```markdown
# @yk-yong/rn-rich-text-dom

Forgiving HTML → DOM parsing and traversal for the `rn-rich-text` renderer.
React-free; built on `htmlparser2` / `domhandler` / `domutils`.

\`\`\`ts
import { parse, getElementsByTagName, isTag } from '@yk-yong/rn-rich-text-dom'

const doc = parse('<p>Hello <b>world</b></p>')
const paragraphs = getElementsByTagName('p', doc)
\`\`\`

Entities are left **raw** in the DOM (e.g. `&amp;` stays `&amp;`); decoding happens
later in the CSS/render layer.
```

- [ ] **Step 6: Create `packages/dom/src/types.ts`**

```ts
export type {
  AnyNode,
  ChildNode,
  ParentNode,
  Node,
  NodeWithChildren,
  Document,
  Element,
  Text,
  Comment,
  CDATA,
  DataNode,
} from 'domhandler'
```

- [ ] **Step 7: Create `packages/dom/src/index.ts` (types-only for now)**

```ts
export * from './types'
```

- [ ] **Step 8: Add runtime dependencies**

Run: `pnpm add --filter @yk-yong/rn-rich-text-dom htmlparser2 domhandler domutils domelementtype`
Expected: adds the four deps to `packages/dom/package.json` `dependencies` and updates the lockfile.

- [ ] **Step 9: Wire the project reference into the root `tsconfig.json`**

Replace the root `tsconfig.json` contents with:

```json
{
  "files": [],
  "references": [{ "path": "packages/dom" }]
}
```

- [ ] **Step 10: Verify install, typecheck, and the type build**

Run: `pnpm install && pnpm typecheck && tsc -b`
Expected: install succeeds; `typecheck` (the package's `tsc -p tsconfig.test.json`) passes; `tsc -b` emits `packages/dom/dist/index.d.ts`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(dom): scaffold @yk-yong/rn-rich-text-dom package"
```

---

## Task 7: `parse(html)` → `Document` (TDD)

**Files:**
- Create: `packages/dom/test/parse.test.ts`, `packages/dom/src/parse.ts`
- Modify: `packages/dom/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/dom/test/parse.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parse } from '../src'
import type { Comment, Element, Text } from '../src'

describe('parse', () => {
  it('returns a Document for a simple element', () => {
    const doc = parse('<p>hello</p>')
    expect(doc.type).toBe('root')
    expect(doc.children).toHaveLength(1)
    const p = doc.children[0] as Element
    expect(p.type).toBe('tag')
    expect(p.name).toBe('p')
    expect((p.children[0] as Text).data).toBe('hello')
  })

  it('preserves nesting', () => {
    const doc = parse('<div><p>1</p><p>2</p></div>')
    const div = doc.children[0] as Element
    expect(div.name).toBe('div')
    const ps = div.children.filter((n): n is Element => n.type === 'tag')
    expect(ps).toHaveLength(2)
    expect((ps[0]!.children[0] as Text).data).toBe('1')
    expect((ps[1]!.children[0] as Text).data).toBe('2')
  })

  it('parses attributes (lower-cased names)', () => {
    const doc = parse('<a href="/x" class="y z" data-id="1">t</a>')
    const a = doc.children[0] as Element
    expect(a.attribs).toEqual({ href: '/x', class: 'y z', 'data-id': '1' })
  })

  it('treats void elements as childless', () => {
    const doc = parse('<p>a<br>b</p>')
    const p = doc.children[0] as Element
    expect(p.children).toHaveLength(3)
    const br = p.children[1] as Element
    expect(br.type).toBe('tag')
    expect(br.name).toBe('br')
    expect(br.children).toHaveLength(0)
    expect((p.children[0] as Text).data).toBe('a')
    expect((p.children[2] as Text).data).toBe('b')
  })

  it('keeps comments as comment nodes', () => {
    const doc = parse('<!-- hi -->')
    const c = doc.children[0] as Comment
    expect(c.type).toBe('comment')
    expect(c.data).toBe(' hi ')
  })

  it('leaves HTML entities raw (decoded later in the render layer)', () => {
    const doc = parse('<p>a &amp; b &lt;c&gt;</p>')
    const p = doc.children[0] as Element
    expect((p.children[0] as Text).data).toBe('a &amp; b &lt;c&gt;')
  })

  it('does not throw on malformed input and still nests recoverable text', () => {
    expect(() => parse('<div><span>oops')).not.toThrow()
    const doc = parse('<div><span>oops')
    const div = doc.children[0] as Element
    const span = div.children[0] as Element
    expect(span.name).toBe('span')
    expect((span.children[0] as Text).data).toBe('oops')
  })

  it('ignores stray closing tags', () => {
    const doc = parse('<div></p></div>')
    const div = doc.children[0] as Element
    expect(div.name).toBe('div')
    expect(div.children.filter((n) => n.type === 'tag')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — Vite cannot resolve the `parse` export from `../src` (only types are exported so far).

- [ ] **Step 3: Implement `packages/dom/src/parse.ts`**

```ts
import { parseDocument } from 'htmlparser2'
import type { Document } from 'domhandler'

export interface ParseOptions {
  /** Lower-case tag names (HTML semantics). Default `true`. */
  lowerCaseTags?: boolean
  /** Lower-case attribute names. Default `true`. */
  lowerCaseAttributeNames?: boolean
}

const DEFAULTS = {
  // Keep entities raw in the DOM; decoding happens in the css/render layer.
  decodeEntities: false,
  // HTML semantics: void elements, case-insensitive tags, optional closings.
  xmlMode: false,
  lowerCaseTags: true,
  lowerCaseAttributeNames: true,
  recognizeSelfClosing: true,
} as const

/** Parse an HTML string into a forgiving, queryable DOM `Document`. */
export function parse(html: string, options: ParseOptions = {}): Document {
  return parseDocument(html, { ...DEFAULTS, ...options })
}
```

- [ ] **Step 4: Export `parse` from the barrel**

Replace `packages/dom/src/index.ts` with:

```ts
export { parse } from './parse'
export type { ParseOptions } from './parse'
export * from './types'
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS — all 8 `parse` cases green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(dom): add parse(html) → Document"
```

---

## Task 8: Node guards (TDD)

**Files:**
- Create: `packages/dom/test/guards.test.ts`, `packages/dom/src/guards.ts`
- Modify: `packages/dom/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/dom/test/guards.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parse, isComment, isDocument, isTag, isText, hasChildren } from '../src'
import type { Element } from '../src'

describe('node guards', () => {
  const doc = parse('<div>hi<!-- c --></div>')
  const div = doc.children[0] as Element
  const text = div.children[0]
  const comment = div.children[1]

  it('isDocument identifies the root', () => {
    expect(isDocument(doc)).toBe(true)
    expect(isDocument(div)).toBe(false)
  })

  it('isTag identifies elements', () => {
    expect(isTag(div)).toBe(true)
    expect(isTag(text)).toBe(false)
  })

  it('isText identifies text nodes', () => {
    expect(isText(text)).toBe(true)
    expect(isText(div)).toBe(false)
  })

  it('isComment identifies comments', () => {
    expect(isComment(comment)).toBe(true)
    expect(isComment(text)).toBe(false)
  })

  it('hasChildren is true for elements and documents', () => {
    expect(hasChildren(div)).toBe(true)
    expect(hasChildren(doc)).toBe(true)
    expect(hasChildren(text)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `isTag`/`isText`/`isComment`/`isDocument`/`hasChildren` are not exported from `../src`.

- [ ] **Step 3: Implement `packages/dom/src/guards.ts`**

```ts
export {
  isTag,
  isText,
  isComment,
  isCDATA,
  isDirective,
  isDocument,
  hasChildren,
} from 'domhandler'
export { ElementType } from 'domelementtype'
```

- [ ] **Step 4: Re-export guards from the barrel**

Replace `packages/dom/src/index.ts` with:

```ts
export { parse } from './parse'
export type { ParseOptions } from './parse'
export * from './guards'
export * from './types'
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS — `parse` + `guards` suites green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(dom): re-export typed node guards"
```

---

## Task 9: Query / traversal helpers (TDD)

**Files:**
- Create: `packages/dom/test/query.test.ts`, `packages/dom/src/query.ts`
- Modify: `packages/dom/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/dom/test/query.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  parse,
  findAll,
  findOne,
  getAttributeValue,
  getElementById,
  getElementsByTagName,
  getName,
  getText,
  nextElementSibling,
  prevElementSibling,
  textContent,
} from '../src'
import type { Element } from '../src'

describe('query helpers', () => {
  const html =
    '<article id="root"><h1>Title</h1><p class="lead">Hello <b>World</b></p><p>Second</p></article>'
  const doc = parse(html)

  it('getElementsByTagName finds all matching elements', () => {
    expect(getElementsByTagName('p', doc)).toHaveLength(2)
  })

  it('getElementById finds by id', () => {
    const el = getElementById('root', doc)
    expect(el && getName(el)).toBe('article')
  })

  it('findOne returns the first match', () => {
    const h1 = findOne((el) => el.name === 'h1', doc.children)
    expect(h1 && getText(h1)).toBe('Title')
  })

  it('findAll returns every match', () => {
    expect(findAll((el) => el.name === 'p', doc.children)).toHaveLength(2)
  })

  it('getText concatenates descendant text', () => {
    const lead = findOne((el) => el.attribs.class === 'lead', doc.children)
    expect(lead && getText(lead)).toBe('Hello World')
  })

  it('textContent mirrors DOM textContent (comments excluded)', () => {
    expect(textContent(doc)).toBe('TitleHello WorldSecond')
  })

  it('getAttributeValue reads attributes', () => {
    const article = getElementById('root', doc)!
    expect(getAttributeValue(article, 'id')).toBe('root')
  })

  it('navigates element siblings', () => {
    const firstP = getElementsByTagName('p', doc)[0]!
    const next = nextElementSibling(firstP) as Element
    expect(getName(next)).toBe('p')
    expect(getText(next)).toBe('Second')
    const prev = prevElementSibling(firstP) as Element
    expect(getName(prev)).toBe('h1')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — none of the `domutils` helpers are exported from `../src`.

- [ ] **Step 3: Implement `packages/dom/src/query.ts`**

```ts
export {
  getElementsByTagName,
  getElementsByTagType,
  getElementById,
  findOne,
  findAll,
  getChildren,
  getParent,
  getSiblings,
  nextElementSibling,
  prevElementSibling,
  getName,
  getAttributeValue,
  hasAttrib,
  getText,
  textContent,
  innerText,
  getInnerHTML,
  getOuterHTML,
} from 'domutils'
```

- [ ] **Step 4: Re-export query helpers from the barrel**

Replace `packages/dom/src/index.ts` with the final barrel:

```ts
export { parse } from './parse'
export type { ParseOptions } from './parse'
export * from './guards'
export * from './query'
export * from './types'
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS — `parse`, `guards`, and `query` suites all green.

- [ ] **Step 6: Typecheck (incl. tests) and commit**

Run: `pnpm typecheck`
Expected: exits 0.

```bash
git add -A
git commit -m "feat(dom): re-export domutils traversal helpers"
```

---

## Task 10: Build verification (ESM + CJS + d.ts) and consumer smoke test

**Files:** none created — this task verifies the build pipeline end-to-end. (`dist/` is gitignored.)

- [ ] **Step 1: Build the package**

Run: `pnpm build`
Expected: `pnpm -r run build` runs tsup (emits JS), then `tsc -b` emits declarations. No errors.

- [ ] **Step 2: Verify all three artifacts exist**

Run: `ls packages/dom/dist`
Expected: includes `index.js` (ESM), `index.cjs` (CJS), and `index.d.ts`.

- [ ] **Step 3: Smoke-test the ESM build**

Run:
```bash
node --input-type=module -e "import { parse } from './packages/dom/dist/index.js'; console.log(parse('<p>x</p>').children[0].name)"
```
Expected: prints `p`.

- [ ] **Step 4: Smoke-test the CJS build**

Run:
```bash
node -e "const { parse } = require('./packages/dom/dist/index.cjs'); console.log(parse('<p>x</p>').children[0].name)"
```
Expected: prints `p`.

- [ ] **Step 5: Verify a clean rebuild**

Run: `pnpm clean && pnpm build`
Expected: `dist/` is removed then regenerated with the same three artifacts; no errors.

> No commit — nothing tracked changed. This task is a gate before wiring CI.

---

## Task 11: Governance files (LICENSE, README, CONTRIBUTING, templates, example stub)

**Files:**
- Create: `LICENSE`, `README.md`, `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `example/README.md`

- [ ] **Step 1: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 yk-yong

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create the root `README.md`**

```markdown
# rn-rich-text

A modern, **Fabric-native** HTML renderer for React Native — a community-maintained,
New-Architecture-first alternative to `react-native-render-html`.

> Working name; the npm scope/name (`@yk-yong/…`) is a placeholder, renameable.

## Packages

| Package | Status | Description |
| --- | --- | --- |
| `@yk-yong/rn-rich-text-dom` | Phase 0 ✅ | Forgiving HTML → DOM, traversal, node guards. React-free. |
| `@yk-yong/rn-rich-text-css` | Phase 1 | CSS engine: parse, selectors, specificity, cascade → RN styles. |
| `@yk-yong/rn-rich-text-core` | Phase 2 | Styled render-tree builder. |
| `@yk-yong/rn-rich-text` | Phase 2 | The public `<RichText>` component + renderer registry. |

## Development

\`\`\`bash
corepack enable
pnpm install
pnpm build      # tsup (JS) + tsc -b (types)
pnpm typecheck
pnpm test
pnpm lint
\`\`\`

See [CONTRIBUTING.md](./CONTRIBUTING.md). Licensed [MIT](./LICENSE).
```

- [ ] **Step 3: Create `CONTRIBUTING.md`**

```markdown
# Contributing

Thanks for helping build `rn-rich-text`!

## Setup

\`\`\`bash
corepack enable          # provides pnpm
pnpm install
\`\`\`

Node ≥ 20.18 and pnpm (pinned via `packageManager`) are required.

## Workflow

- Branch from `main`.
- The lower packages (`dom`, `css`, `core`) are **React-free** — keep them that way and
  cover edge cases with exhaustive Vitest unit tests.
- Before pushing: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) (enforced by
commitlint via a Husky `commit-msg` hook). Examples:

- `feat(dom): add comment-stripping helper`
- `fix(css): correct specificity tie-break`
- `chore: bump tooling`

## Changesets

User-facing changes need a changeset:

\`\`\`bash
pnpm changeset
\`\`\`

Pick the affected packages and a semver bump, and commit the generated file.
```

- [ ] **Step 4: Create `.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## What & why

<!-- Describe the change and the motivation. -->

## Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass locally
- [ ] Added/updated unit tests
- [ ] Added a changeset (`pnpm changeset`) if this affects published packages
- [ ] Conventional Commit title
```

- [ ] **Step 5: Create `.github/ISSUE_TEMPLATE/bug_report.md`**

```markdown
---
name: Bug report
about: Something renders or parses incorrectly
labels: bug
---

**HTML / CSS input**

\`\`\`html
<!-- minimal reproduction -->
\`\`\`

**Expected vs actual**

**Environment**
- package + version:
- React Native version:
- platform (iOS/Android), New Architecture: yes
```

- [ ] **Step 6: Create `.github/ISSUE_TEMPLATE/feature_request.md`**

```markdown
---
name: Feature request
about: Suggest a capability (tag support, CSS property, API)
labels: enhancement
---

**Problem**

**Proposed solution**

**Alternatives considered**
```

- [ ] **Step 7: Create the `example/README.md` stub**

```markdown
# example

Placeholder for the example app. An Expo (New Architecture) app that dogfoods
`@yk-yong/rn-rich-text` is wired up in **Phase 2**. Intentionally not a workspace
package yet.
```

- [ ] **Step 8: Format and commit**

Run: `pnpm format`
Expected: no errors.

```bash
git add -A
git commit -m "docs: add LICENSE, README, CONTRIBUTING, and GitHub templates"
```

---

## Task 12: Conventional Commits (Husky + commitlint)

**Files:**
- Create: `commitlint.config.mjs`, `.husky/commit-msg`
- Modify: `package.json` (Husky adds the `prepare` script)

- [ ] **Step 1: Add Husky and commitlint**

Run: `pnpm add -D -w husky @commitlint/cli @commitlint/config-conventional`

- [ ] **Step 2: Initialize Husky**

Run: `pnpm exec husky init`
Expected: creates `.husky/` (with a sample `pre-commit`) and adds `"prepare": "husky"` to the root `package.json` scripts.

- [ ] **Step 3: Remove the sample `pre-commit` hook**

Run: `rm -f .husky/pre-commit`

> Phase 0 enforces commit-message format only; whole-repo lint runs in CI. (A `lint-staged` pre-commit hook can be added later.)

- [ ] **Step 4: Create `commitlint.config.mjs`**

```js
export default { extends: ['@commitlint/config-conventional'] }
```

- [ ] **Step 5: Create `.husky/commit-msg`**

```sh
pnpm exec commitlint --edit "$1"
```

- [ ] **Step 6: Verify commitlint accepts/rejects correctly**

Run:
```bash
echo "feat(dom): valid message" | pnpm exec commitlint
echo "broken message" | pnpm exec commitlint; echo "exit: $?"
```
Expected: the first command exits 0 (no output); the second prints errors and `exit: 1`.

- [ ] **Step 7: Commit (exercises the hook)**

```bash
git add -A
git commit -m "chore: enforce Conventional Commits via Husky + commitlint"
```
Expected: the `commit-msg` hook passes and the commit succeeds.

---

## Task 13: Changesets (versioning)

**Files:**
- Create: `.changeset/config.json`, `.changeset/README.md`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Add the Changesets CLI**

Run: `pnpm add -D -w @changesets/cli`

- [ ] **Step 2: Create `.changeset/config.json`**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 3: Create `.changeset/README.md`**

```markdown
# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).
Run `pnpm changeset` to record a user-facing change; CI turns accumulated
changesets into version bumps and a release.
```

- [ ] **Step 4: Add release scripts to the root `package.json`**

Add inside `"scripts"`:

```json
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm build && changeset publish"
```

- [ ] **Step 5: Verify Changesets is wired up**

Run: `pnpm changeset status --since=HEAD`
Expected: runs without error (reports no changesets, which is fine).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: configure Changesets for versioning"
```

---

## Task 14: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.12.1

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

> Keep the `pnpm/action-setup` version in sync with the root `packageManager` field.

- [ ] **Step 2: Reproduce the CI gate locally**

Run: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every step exits 0. (`--frozen-lockfile` fails if the lockfile is stale — if so, run `pnpm install`, commit the lockfile, and retry.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ci: lint, typecheck, test, and build on every PR"
```

---

## Task 15: Changesets release workflow (optional; inert until secrets set)

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.12.1

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Create Release PR or publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

> With no changesets present this job exits cleanly without publishing. Publishing only happens once `NPM_TOKEN` is configured and the final package name is confirmed — so this stays green during Phase 0. Delete this task if you prefer to add releases in a later phase.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "ci: add Changesets release workflow"
```

---

## Task 16: Final full-pipeline verification

- [ ] **Step 1: Run the complete gate from a clean install**

Run:
```bash
pnpm clean
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```
Expected: every command exits 0. Coverage prints a table for `packages/dom/src` (`parse.ts`, `guards.ts`, `query.ts`).

- [ ] **Step 2: Confirm the deliverable**

Verify all are true:
- `packages/dom` builds `index.js` + `index.cjs` + `index.d.ts` and is importable from both ESM and CJS (Task 10).
- `parse`, the node guards, and the traversal helpers are unit-tested and green.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass — the CI gate is green.

- [ ] **Step 3: Confirm a clean tree**

Run: `git status`
Expected: clean (all work committed; `dist/`, `coverage/`, `node_modules/` ignored).

---

## Self-review — spec coverage

| Phase 0 spec requirement | Task(s) |
| --- | --- |
| pnpm workspaces, `only-allow` guard | 1 |
| TypeScript + **project references** | 2, 6 |
| ESLint + Prettier | 3, 4 |
| Vitest (unit tests) | 5, 7–9 |
| tsup build (ESM+CJS+d.ts) | 5, 6, 10 |
| `packages/dom` only in Phase 0 | 6 |
| `parse(html) → Document` (forgiving) | 7 |
| Curated traversal helpers (`getElementsByTagName`, …) | 9 |
| Typed node guards (`isTag`, `isText`, `isComment`, …) | 8 |
| Entities left **raw** in the DOM | 7 (test + `decodeEntities: false`) |
| Exhaustive unit tests (nesting, void els, attrs, malformed, entities, comments) | 7–9 |
| MIT `LICENSE`, `README`, `CONTRIBUTING` | 11 |
| Issue/PR templates | 11 |
| `example/` app stub | 11 |
| Conventional Commits | 12 |
| Changesets versioning + automated releases | 13, 15 |
| GitHub Actions CI (lint + typecheck + test on PR) | 14 |
| New-Architecture-only / RN peer floors | N/A in Phase 0 (no RN pkg yet) — Phase 2 |

**Deliverable:** a tested, React-free HTML→DOM package and a green CI pipeline. ✅

## Notes for the executor

- **Type imports:** `verbatimModuleSyntax` is on — re-export types with `export type` and import types with `import type` (see `types.ts`, `parse.ts`). The compiler will tell you if you miss one.
- **No DOM lib on purpose:** if you reach for a browser global (`document`, `window`, global `Element`), stop — these packages are React-free and browser-free. The node types come from `domhandler` via `./types`.
- **`selectAll`/CSS selectors are Phase 1.** Don't pull in `css-select` here.
- **If a `domutils`/`domhandler` export name differs** in the installed version, the failing test or `tsc` will pinpoint it — adjust the re-export list in `query.ts`/`guards.ts` to match; don't re-implement.

