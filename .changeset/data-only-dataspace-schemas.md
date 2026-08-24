---
'@finos/legend-application-marketplace': patch
'@finos/legend-extension-dsl-data-space': patch
---

Resolve data space context for the Intelligence & Agents tab from the data space analysis instead of opening a product viewer, so a failed load no longer raises a data product notification at an Agents tab user.

The model context a data space builds now also lists its own callable functions, capped at twenty, which reaches the data space page as well.
