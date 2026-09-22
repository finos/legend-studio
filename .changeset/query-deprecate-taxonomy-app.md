---
'@finos/legend-application-query': patch
---

Deprecate the `taxonomy` config and the outbound link to Legend Taxonomy from the "About Data Space" modal. The "Open Data Space" button now navigates to Legend Marketplace's legacy data product view (`/dataProduct/legacy/{GAV}/{dataspacePath}`) using the existing `marketplace.url` config, and is enabled when `marketplaceApplicationUrl` is configured.
