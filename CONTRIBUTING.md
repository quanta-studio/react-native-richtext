# Contributing

Thanks for helping build `rn-rich-text`!

## Setup

```bash
corepack enable # provides pnpm
pnpm install
```

Node ≥ 20.18 and pnpm (pinned via `packageManager`) are required.

## Workflow

- Branch from `main`.
- The lower packages (`dom`, `css`, `core`) are **React-free** — keep them that way and
  cover edge cases with exhaustive Vitest unit tests.
- Before pushing: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
  (run `pnpm format` to auto-fix formatting). CI runs the same gate.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) (enforced by
commitlint via a Husky `commit-msg` hook). Examples:

- `feat(dom): add comment-stripping helper`
- `fix(css): correct specificity tie-break`
- `chore: bump tooling`

## Changesets

User-facing changes need a changeset:

```bash
pnpm changeset
```

Pick the affected packages and a semver bump, and commit the generated file.
