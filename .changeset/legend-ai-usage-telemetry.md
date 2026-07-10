---
'@finos/legend-lego': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-extension-dsl-data-space': patch
---

Add optional `onLogTelemetryEvent` hook on `LegendAIChat` and emit `legend-ai.*` events (assistant opened, question asked, response received, feedback submitted) from the data product and data space viewers. Only non-sensitive metadata is logged — never the raw question text or queried values.
