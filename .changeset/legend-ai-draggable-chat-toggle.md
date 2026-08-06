---
'@finos/legend-lego': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-extension-dsl-data-space': patch
'@finos/legend-application-marketplace': patch
---

Make the Legend AI chat launcher a floating, draggable button so it can be moved clear of transient notifications in the bottom-right corner. The launcher docks to the nearest viewport corner when dropped, re-clamps itself on window resize, distinguishes a drag from a click, and opens the chat on a plain click. Long data product names are now truncated with an ellipsis in the chat header (so the minimize/close actions stay visible) and in the launcher's hover label.
