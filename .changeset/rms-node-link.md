---
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-marketplace': patch
---

Add `renderOrganizationalScopeConsumer`, a JSX-returning counterpart to `stringifyOrganizationalScope` which prefers a plugin-provided `organizationalScopeTypeDetailsRenderer` (allowing richer content such as a link) and otherwise falls back to the plain-text stringified scope. Use it for the inline consumer display in the Data Access Request Viewer ("Ordered For") and the entitlements data grid consumer cell, so plugin-contributed organizational scope types can render clickable content instead of plain text.
