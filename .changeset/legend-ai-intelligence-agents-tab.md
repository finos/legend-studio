---
'@finos/legend-application-marketplace': patch
'@finos/legend-lego': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-extension-dsl-data-space': patch
---

Legend Marketplace **Intelligence & Agents** tab: route data product and data space questions through the shared Legend AI pipeline for query generation, execution and analysis, auto-routing to the Legend AI Orchestrator when a SQL attempt dead-ends, and protect the `/agents` route so its OIDC token stays refreshed.

Adds question-driven value grounding, a join overlap probe, a deterministic access point catalog, Python and Open-in-DataCube actions, and telemetry. The probe runs wherever the shared pipeline runs, so the data product and data space pages pay it too.
