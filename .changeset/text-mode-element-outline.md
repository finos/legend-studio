---
'@finos/legend-application-studio': patch
'@finos/legend-dev-utils': patch
---

Text mode shows an element outline: the declaration of the element being read stays pinned at the top while scrolling, the quick outline (Ctrl/Cmd + Shift + O) lists the elements, and the header shows the element under the cursor. Studio's Monaco bundle now includes the `documentSymbols`, `stickyScroll` and `quickOutline` features.
