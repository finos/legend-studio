---
'@finos/legend-shared': patch
'@finos/legend-graph': patch
---

Reuse entity hashes across calls of `buildHashesIndex`: opening a workspace indexes its HEAD, its BASE and the project's latest revision, which mostly hold the same entities, so unchanged entities are no longer deserialized and hashed three times. Add `fastHash`, a fast non-cryptographic 64-bit string hash for comparisons within the app.
