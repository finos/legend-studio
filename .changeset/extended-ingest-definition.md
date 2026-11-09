---
'@finos/legend-graph': patch
'@finos/legend-application-studio': patch
---

Support `extendedIngestDefinition` and `ExtendedAvailability` elements: they are now built as `ExtendedIngestDefinition` / `ExtendedAvailability` (subtypes of `IngestDefinition` / `Availability`, so Studio opens the existing editors for them) and their `_type` is preserved on roundtrip.
