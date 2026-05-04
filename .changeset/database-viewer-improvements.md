---
'@finos/legend-application-studio': patch
'@finos/legend-graph': patch
---

Database viewer improvements:

- **Metamodel coverage**: rendered View metadata (`distinct`, `filter`, `groupBy`) with lazy-resolved Pure code; self-joins and cross-database joins as canvas edges + foreign-relation stub nodes; `IncludeStore` section in the side panel; stereotypes and tagged values shown inline as a popover-driven badge; table `milestoning` (business / processing, plus snapshot variants) shown as a color-coded canvas tag and a side-panel meta-row; Lakehouse-generated database read-only banner.
- **Side panel**: resizable + collapsible left panel; search/filter box with force-expand and "visible/total" counts; expand-all / collapse-all buttons; loading skeletons for lazy formulas; copy-to-clipboard buttons on rendered Pure code; empty-state messages.
- **Canvas**: floating toolbar with fit-all, fit-selection, reset-layout, and PNG/SVG export buttons; mini-map node-color highlights selected relation and join endpoints; view column-level focus drives a single-row highlight on the matching node; pan-to-fit on join selection.
- **Engineering**: new `DatabaseDiagramHelper` test suite; integration test sweep for the editor; re-exported `BusinessMilestoning`, `BusinessSnapshotMilestoning`, `ProcessingMilestoning`, `ProcessingSnapshotMilestoning`, `TemporalMilestoning` from `@finos/legend-graph` for editor consumption.
