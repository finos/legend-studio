---
'@finos/legend-application-studio': patch
'@finos/legend-application-studio-bootstrap': patch
'@finos/legend-cube-builder': patch
'@finos/legend-graph': patch
---

Legend Cube in Studio: an ingest definition's editor offers Create MatView with Cube (behind `NonProductionFeatureFlag`). Cube opens full screen over Studio, reading only the project's own ingest definitions, as the workspace holds them, and running on the project's lakehouse runtime; Add as MatView adds the step that runs to the definition as a materialized view (a `FunctionSource` data set). Cube's host can now turn off its sample data and examples, give its own ingest definitions to the engine, and add buttons to the header; the floating step editor stays above a dialog that hosts the page; the Ingest tab picks the only producer deployment and starts on the environment's warehouse; and the canvas keeps its controls' colours where React Flow 11's stylesheet is loaded too.
