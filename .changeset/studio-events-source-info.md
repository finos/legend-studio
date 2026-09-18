---
'@finos/legend-application-studio': patch
'@finos/legend-extension-dsl-data-space-studio': patch
---

Thread `LegendSourceInfo` (workspace / project-viewer / GAV-viewer / showcase) into the remaining Legend Studio telemetry events so downstream analytics can slice every editor-context event by where it happened.

All helper methods gain a trailing optional `sourceInfo?: LegendSourceInfo` parameter (non-breaking), and every editor-context call site now passes `editorStore.editorMode.getSourceInfo()`:

- `editor.compilation.compile-graph.launch` / `editor.form-mode.compilation.success`
- `editor.compilation.compile-text.launch` / `editor.text-mode.compilation.success`
- `editor.test.test-data-generation.launch` / `editor.test.test-data-generation.success` (both direct + seed-data variants)
- `graph-manager.initialize-graph.success` — from the workspace editor, the project viewer, and the showcase viewer
- `editor.service-editor.legendai-suggest.launch` / `.apply` / `.discard` / `.failure`
- `editor.dataspace.legendai-suggest.launch` / `.apply` / `.discard` / `.failure`
- `editor.data-product.legendai-suggest.launch` / `.apply` / `.discard` / `.failure`

Virtual assistant and showcase manager events intentionally do not attach `sourceInfo` because they can fire outside any editor context (workspace setup page, home, viewer routes, etc.). Lakehouse deploy and dev-metadata push already carried `sourceInfo` and are unchanged.
