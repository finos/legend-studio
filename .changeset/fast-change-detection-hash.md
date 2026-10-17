---
'@finos/legend-shared': patch
'@finos/legend-graph': patch
---

Use a fast 64-bit non-cryptographic hash for change detection: `hashValue` (and so `hashArray` and every `hashCode`) no longer uses a pure JavaScript SHA-1, and raw lambdas are hashed from a key-sorted JSON string instead of with `object-hash`. Hashing took most of the time Studio spends starting change detection on large workspaces. Hash values change: they are only compared within the app. Add `stableStringify`.
