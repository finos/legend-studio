---
'@finos/legend-extension-dsl-data-product': patch
---

Isolate completed-data-request lookup and scope to APG in approved users fetch

Error from the new completed-data-request calls no longer discards the
already-fetched contract-based approved users list, and completed
requests are now filtered to the current access point group instead of
the whole data product.
