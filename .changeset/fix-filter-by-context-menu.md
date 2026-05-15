---
'@finos/legend-query-builder': patch
---

Fix Filter By and Filter Out not applying from AG Grid context menu. The cell selection stats refactor removed the `resultState.setSelectedCells()` call from `onCellSelectionChanged`, leaving `selectedCells` empty when `filterByOrOutValues` runs. The fix syncs the grid's cell-range selection into `resultState.selectedCells` at context-menu build time.
