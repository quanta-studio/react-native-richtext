---
'@yk-yong/react-native-richtext': minor
---

Phase 5a accessibility: links now announce as links (`accessibilityRole="link"`), headings (`h1`–`h6`) render with the `header` role via a new `Heading` renderer, and images expose the `image` role alongside their alt label (decorative no-alt images stay hidden from screen readers). All on by default and customizable via the `renderers` prop.
