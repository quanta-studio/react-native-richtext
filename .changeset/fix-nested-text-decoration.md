---
'@yk-yong/react-native-richtext-css': patch
'@yk-yong/react-native-richtext': patch
---

Fix nested text decorations being lost. When elements with different `text-decoration-line` values nest (e.g. `<u>` inside `<strike>`), the inner text now correctly shows **both** lines (`underline line-through`) instead of only the innermost. `text-decoration-line` is now accumulated (unioned) down the element tree, matching browser behavior — React Native honors only one decoration per `<Text>`, so the combined value is computed during the cascade.
