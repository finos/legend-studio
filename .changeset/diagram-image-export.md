---
'@finos/legend-extension-dsl-diagram': minor
'@finos/legend-extension-dsl-diagram-studio': minor
'@finos/legend-shared': patch
---

Add export of diagrams as PNG and SVG images: the diagram editor header has a new export menu that downloads the whole diagram (not just the visible viewport), without selection or hover highlights. PNG exports are rendered at 2x for high DPI screens and capped to a size browsers can allocate; SVG exports are vector, produced by replaying the diagram renderer onto a lightweight SVG rendering context.
