---
'@finos/legend-graph': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-marketplace': patch
---

Read the `resourceBuilder` of a data product artifact access point implementation as a list, matching the new artifact schema. Artifacts generated before the change, which have a single resource builder, still load. A single resource builder is read as a one-element list, and a missing or `null` one as an empty list. A resource builder of an unknown type is read as a `V1_UnknownResourceBuilder` that keeps its raw JSON, so new backend types no longer fail the whole artifact. LegendAI now joins the scripts of all `databaseDDL` resource builders of an access point.
