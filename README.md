# react-native-richtext

A modern, **Fabric-native** HTML renderer for React Native — a community-maintained,
New-Architecture-first alternative to `react-native-render-html`.

> Working name; the npm scope/name (`@yk-yong/…`) is a placeholder, renameable.

## Packages

| Package                               | Status     | Description                                                     |
| ------------------------------------- | ---------- | --------------------------------------------------------------- |
| `@yk-yong/react-native-richtext-dom`  | Phase 0 ✅ | Forgiving HTML → DOM, traversal, node guards. React-free.       |
| `@yk-yong/react-native-richtext-css`  | Phase 1    | CSS engine: parse, selectors, specificity, cascade → RN styles. |
| `@yk-yong/react-native-richtext-core` | Phase 2    | Styled render-tree builder.                                     |
| `@yk-yong/react-native-richtext`      | Phase 2    | The public `<RichText>` component + renderer registry.          |

## Development

```bash
corepack enable
pnpm install
pnpm build # tsup (JS) + tsc -b (types)
pnpm typecheck
pnpm test
pnpm lint
```

See [CONTRIBUTING.md](./CONTRIBUTING.md). Licensed [MIT](./LICENSE).
