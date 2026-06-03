---
'@finos/legend-application-marketplace': patch
---

Avoid redundant API calls on access-token rotation in the admin contracts and subscriptions dashboards. The AG Grid server-side datasources now take a token-provider callback instead of a token value, so the datasource is no longer recreated on every token rotation (which previously caused the grid to reset and refetch the visible page).
