---
'@finos/legend-art': patch
---

Legend Cube now follows Legend Marketplace's two themes, High-Contrast Light and High-Contrast Dark, instead of falling back to the dark defaults. legend-art maps its semantic color tokens for `theme__hc-light` and `theme__hc-dark`, scoped to Cube (`.legend-cube`, and the node editor and tour layers it opens outside it), so the rest of Marketplace keeps its colors.
