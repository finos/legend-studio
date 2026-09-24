---
'@finos/legend-extension-dsl-data-space': patch
---

Add support for the new `dataSpaceReferencesMetadataInfo` and `executableAccessorInfo` fields returned by the Data Space analytics endpoint. The viewer now uses them to show per-executable "Request Access" controls for the Lakehouse Data Products an executable reaches, and hides the Data Access section entirely for Data Spaces with no execution contexts.
