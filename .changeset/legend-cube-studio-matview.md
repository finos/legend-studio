---
'@finos/legend-application-studio': patch
'@finos/legend-application-studio-bootstrap': patch
'@finos/legend-cube-builder': patch
'@finos/legend-graph': patch
---

Legend Cube in Studio: an ingest definition's editor offers Create MatView with Cube (behind `NonProductionFeatureFlag`). Cube opens full screen over Studio and reads only the project's own ingest definitions and data products, as the workspace holds them: the source dialog lists them by name, each path muted beside it, with no class, deployment or search to pick, and runs use the workspace and the project's lakehouse runtime, as Studio's own queries do. Add as MatView adds the step that runs to the definition as a materialized view (a `FunctionSource` data set). Cube's host can now name the one project its sources come from (`CubeHost.project`), turn off its sample data and examples, give the engine its own ingest definitions and data product model, and add buttons to the header; the floating step editor stays above a dialog that hosts the page; the Ingest tab picks the only producer deployment and starts on the environment's warehouse; a dialog's primary button is an accent button in every theme; and the canvas keeps its controls' colours where React Flow 11's stylesheet is loaded too.
