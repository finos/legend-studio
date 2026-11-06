---
'@finos/legend-application-marketplace': patch
---

Checking a contract for missing ingest definitions now reuses the contract already loaded on the entitlements dashboard, reuses a single graph manager, and fetches only the data product entity it needs from depot. The contract task page now fetches the contract once, with its members, instead of fetching it again when the contract viewer initializes. The entitlements dashboard now shares the cached pending tasks response with the header badge instead of fetching it a second time. The dashboard also caches data product details across contracts, ignores contract errors that finish loading after the selection has changed, and uses the data product lookup from the data product extension instead of its own copy.
