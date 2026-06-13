# Example app

Minimal Expo (New Architecture) screen dogfooding `@yk-yong/react-native-richtext`.

To run it, add `example` to the `packages:` list in `pnpm-workspace.yaml`, then from the repo root:

```bash
pnpm install
cd example && pnpm start
```

Run on a simulator/device via the Expo CLI. Not part of CI — for manual visual
validation. If Metro cannot resolve the workspace packages, build them once from
the root (`pnpm build`) so their `dist/` exists.
