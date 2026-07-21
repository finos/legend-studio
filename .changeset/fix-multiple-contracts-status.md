---
'@finos/legend-extension-dsl-data-product': patch
---

Fix Marketplace access point group status showing a stale "pending" state when a user has multiple contracts for the same access point group (e.g. a duplicate request submitted by someone else on their behalf). The contract furthest along in the approval process is now always used, so an approved contract is never masked by a pending duplicate.
