---
'@finos/legend-data-cube': patch
---

Make the grid's "Copy" menu functional: "Plain Text" copies the current cell selection, "Selected Rows as Plain Text" and "Selected Column as Plain Text" expand the selection to the full row(s)/column(s) it touches before copying. These options are disabled when there is no cell selection, and "Selected Rows as Plain Text" is also disabled when the menu is opened from the column header. Clicking a column header now selects the entire column.
